// visit-form-script.js
document.addEventListener("DOMContentLoaded", function() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxppttFwtYoCNfa5hpDgAf_e4Rbh5pPxVjFNfxw7RRUKVY6rR8gt2KQqAjbKa97IEu/exec";
    const SPREADSHEET_ID = "135m99kTLyGXKmG9oxW765YXMp_6OtLy8O1x-PeG_G1U";
    
    const form = document.getElementById('visitForm');
    const statusMessage = document.getElementById('statusMessage');
    const customerNameInput = document.getElementById('customerNameInput');
    const customersDatalist = document.getElementById('customersList');
    const customerCodeInput = document.getElementById('customerCode');
    const submitBtn = document.getElementById('submitBtn');
    const addProductBtn = document.getElementById('addProductBtn');
    const productsContainer = document.getElementById('missingProductsContainer');
    const salesRepSelect = document.getElementById('salesRepName');
    const governorateSelect = document.getElementById('governorate');
    const visitDateInput = document.getElementById('visitDate');
    const visitTimeInput = document.getElementById('visitTime');
    const exitTimeInput = document.getElementById('exitTime');

    let customersData = [];
    let allProductsData = [];
    let isSubmitting = false;

    // Fetch all required data
    Promise.all([
        fetch('sales_representatives.json').then(res => res.json()),
        fetch('customers_main.json').then(res => res.json()),
        fetch('products.json').then(res => res.json()),
        fetch('governorates.json').then(res => res.json())
    ]).then(([reps, customers, products, governorates]) => {
        populateDropdown(salesRepSelect, reps);
        populateDropdown(governorateSelect, governorates);
        customersData = customers;
        populateCustomerDatalist(customersData);
        allProductsData = products.filter(p => p.Product_Code !== "N/A"); // Filter out the 'N/A' entry
        addProductEntry(); // Add the first product entry
    }).catch(error => {
        console.error("Error fetching data:", error);
        statusMessage.textContent = 'خطأ في تحميل البيانات الأساسية.';
        statusMessage.className = 'status error';
    });

    function populateDropdown(selectElement, items) {
        selectElement.innerHTML = '<option value="">اختر...</option>';
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
    }

    function populateCustomerDatalist(customers) {
        customersDatalist.innerHTML = '';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.Customer_Name_AR;
            option.dataset.code = customer.Customer_Code;
            customersDatalist.appendChild(option);
        });
    }

    function populateProductDropdowns() {
        document.querySelectorAll('.productName').forEach(select => {
            select.innerHTML = '<option value="">اختر منتج</option>';
            allProductsData.forEach(product => {
                const option = document.createElement('option');
                option.value = product.Product_Name_AR;
                option.textContent = product.Product_Name_AR;
                option.dataset.code = product.Product_Code;
                option.dataset.category = product.Category;
                select.appendChild(option);
            });
        });
    }
    
    // Add product entry logic
    function addProductEntry() {
        const newEntry = document.createElement('div');
        newEntry.className = 'product-entry';
        newEntry.innerHTML = `
            <button type="button" class="remove-product-btn">X</button>
            <div class="form-group">
                <label>اختر المنتج:</label>
                <select class="productName" name="productName" required></select>
                <input type="hidden" class="productCode" name="productCode">
                <input type="hidden" class="productCategory" name="productCategory"> 
            </div>
            <div class="form-group">
                <label>الكمية:</label>
                <input type="number" class="productQuantity" name="productQuantity" min="1" required>
            </div>
            <div class="form-group">
                <label>الوحدة:</label>
                <select class="productUnit" name="productUnit" required>
                    <option value="">اختر وحدة</option>
                    <option value="كرتون">كرتون</option>
                    <option value="علبة">علبة</option>
                    <option value="حبة">حبة</option>
                </select>
            </div>
            <div class="form-group">
                <label>تاريخ الانتهاء:</label>
                <input type="date" class="productExpiry" name="productExpiry" required>
            </div>
        `;
        productsContainer.appendChild(newEntry);
        populateProductDropdowns();
    }

    // Event Listeners
    addProductBtn.addEventListener('click', addProductEntry);

    productsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-product-btn')) {
            e.target.closest('.product-entry').remove();
        }
    });
    
    productsContainer.addEventListener('change', function(e) {
        if (e.target.classList.contains('productName')) {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const productEntry = e.target.closest('.product-entry');
            const codeInput = productEntry.querySelector('.productCode');
            const categoryInput = productEntry.querySelector('.productCategory');
            codeInput.value = selectedOption.dataset.code || '';
            categoryInput.value = selectedOption.dataset.category || '';
        }
    });

    customerNameInput.addEventListener('input', function() {
        const selectedOption = customersDatalist.querySelector(`option[value="${this.value}"]`);
        if (selectedOption) {
            customerCodeInput.value = selectedOption.dataset.code;
        } else {
            customerCodeInput.value = '';
        }
    });
    
    // Form submission
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        if (isSubmitting) return;
        isSubmitting = true;
        submitBtn.disabled = true;

        statusMessage.textContent = 'جاري إرسال البيانات...';
        statusMessage.className = 'status loading';

        if ("geolocation" in navigator) {
            statusMessage.textContent = 'جاري الحصول على الموقع...';
            statusMessage.className = 'status loading';

            navigator.geolocation.getCurrentPosition(function(position) {
                submitFormData(position.coords.latitude, position.coords.longitude);
            }, function(error) {
                console.error("Error getting location: ", error);
                submitFormData(null, null);
            }, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        } else {
            submitFormData(null, null);
        }
    });
    
    function submitFormData(latitude, longitude) {
        const formData = new FormData(form);
        
        // Prepare products data
        const productsData = [];
        document.querySelectorAll('.product-entry').forEach(entry => {
            const productName = entry.querySelector('.productName').value;
            if (productName) {
                productsData.push({
                    name: productName,
                    code: entry.querySelector('.productCode').value,
                    category: entry.querySelector('.productCategory').value,
                    quantity: entry.querySelector('.productQuantity').value,
                    unit: entry.querySelector('.productUnit').value,
                    expiry: entry.querySelector('.productExpiry').value
                });
            }
        });
        
        formData.append('productsData', JSON.stringify(productsData));
        
        // Append geolocation data
        if (latitude && longitude) {
            formData.append('latitude', latitude);
            formData.append('longitude', longitude);
        }

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            if (data === "Success") {
                statusMessage.textContent = '✅ تم إرسال البيانات بنجاح!';
                statusMessage.className = 'status success';
                form.reset();
                customerCodeInput.value = ''; // Clear hidden field
                // Remove all but the first product entry
                while (productsContainer.children.length > 1) {
                    productsContainer.removeChild(productsContainer.lastChild);
                }
            } else {
                statusMessage.textContent = '❌ خطأ في الإرسال: ' + data;
                statusMessage.className = 'status error';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            statusMessage.textContent = '❌ حدث خطأ غير متوقع: ' + error.message;
            statusMessage.className = 'status error';
        })
        .finally(() => {
            isSubmitting = false;
            submitBtn.disabled = false;
        });
    }

    // Set today's date and time as default values
    const today = new Date();
    const dateFormatted = today.toISOString().split('T')[0];
    const timeFormatted = today.toTimeString().split(' ')[0].substring(0, 5);
    visitDateInput.value = dateFormatted;
    visitTimeInput.value = timeFormatted;
});