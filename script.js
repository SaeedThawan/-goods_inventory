document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("visitForm");
    const addInventoryBtn = document.getElementById("addInventoryBtn");
    const inventoryContainer = document.getElementById("inventoryContainer");
    const inventoryTemplate = document.getElementById("inventoryTemplate");
    const statusMessage = document.getElementById("statusMessage");
    const submitBtn = document.getElementById("submitBtn");

    // إضافة صف جرد جديد
    function addInventoryRow() {
        const clone = inventoryTemplate.content.cloneNode(true);
        const removeBtn = clone.querySelector(".remove-product-btn");
        removeBtn.addEventListener("click", (e) => {
            e.target.closest(".inventory-item").remove();
        });
        inventoryContainer.appendChild(clone);
    }

    // أول صف افتراضي
    addInventoryRow();
    addInventoryBtn.addEventListener("click", () => addInventoryRow());

    // حساب الكمية الإجمالية بالباكت
    function calculateTotal(cartonQty, packetQty, packetsPerCarton) {
        return (cartonQty * packetsPerCarton) + packetQty;
    }

    // تحميل المناديب
    fetch("sales_representatives.json")
      .then(res => res.json())
      .then(data => {
          const select = document.getElementById("salesRepName");
          data.forEach(rep => {
              const option = document.createElement("option");
              option.value = rep;
              option.textContent = rep;
              select.appendChild(option);
          });
      });

    // تحميل المحافظات
    fetch("governorates.json")
      .then(res => res.json())
      .then(data => {
          const select = document.getElementById("governorate");
          data.forEach(gov => {
              const option = document.createElement("option");
              option.value = gov;
              option.textContent = gov;
              select.appendChild(option);
          });
      });

    // تحميل العملاء
    fetch("customers_main.json")
      .then(res => res.json())
      .then(data => {
          const datalist = document.getElementById("customersList");
          data.forEach(cust => {
              const option = document.createElement("option");
              option.value = cust.Customer_Name_AR;
              option.dataset.code = cust.Customer_Code;
              datalist.appendChild(option);
          });
          document.getElementById("customerNameInput").addEventListener("input", (e) => {
              const selected = data.find(c => c.Customer_Name_AR === e.target.value);
              document.getElementById("customerCode").value = selected ? selected.Customer_Code : "";
          });
      });

    // تحميل المنتجات
    fetch("products.json")
      .then(res => res.json())
      .then(data => {
          const datalist = document.getElementById("productsList");
          data.forEach(prod => {
              const option = document.createElement("option");
              option.value = prod.Product_Name_AR;
              option.dataset.code = prod.Product_Code;
              option.dataset.category = prod.Category;
              option.dataset.packets = prod.Packets_Per_Carton || 1;
              datalist.appendChild(option);
          });

          // عند اختيار منتج
          document.addEventListener("input", (e) => {
              if (e.target && e.target.getAttribute("list") === "productsList") {
                  const selected = data.find(p => p.Product_Name_AR === e.target.value);
                  if (selected) {
                      const parent = e.target.closest(".inventory-item");
                      parent.querySelector('input[name="productCode[]"]').value = selected.Product_Code;
                      parent.querySelector('input[name="productCategory[]"]').value = selected.Category;
                      parent.querySelector('input[name="packetsPerCarton[]"]').value = selected.Packets_Per_Carton || 1;
                  }
              }
          });
      });

    // ==========================
    // إرسال النموذج إلى Google Sheets
    // ==========================
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        // منع الإرسال المتكرر
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ جاري الإرسال...";

        // جمع بيانات الجرد
        const inventoryItems = Array.from(document.querySelectorAll(".inventory-item")).map(item => {
            const name = item.querySelector('input[list="productsList"]').value;
            const code = item.querySelector('input[name="productCode[]"]').value;
            const category = item.querySelector('input[name="productCategory[]"]').value;
            const cartonQty = parseInt(item.querySelector('input[name="cartonQty[]"]').value) || 0;
            const packetQty = parseInt(item.querySelector('input[name="packetQty[]"]').value) || 0;
            const packetsPerCarton = parseInt(item.querySelector('input[name="packetsPerCarton[]"]').value) || 1;
            const expiryDate = item.querySelector('input[name="expiryDate[]"]').value;
            const total = calculateTotal(cartonQty, packetQty, packetsPerCarton);
            return { name, code, category, quantity: total, unit: "باكت", expiry: expiryDate };
        });

        // تجهيز البيانات النهائية
        const formData = {
            dataEntryName: document.getElementById("dataEntryName").value,
            salesRepName: document.getElementById("salesRepName").value,
            governorate: document.getElementById("governorate").value,
            customerName: document.getElementById("customerNameInput").value,
            customerCode: document.getElementById("customerCode").value,
            visitDate: document.getElementById("visitDate").value,
            visitTime: document.getElementById("visitTime").value,
            exitTime: document.getElementById("exitTime").value,
            suggestions: document.getElementById("suggestions").value,
            products: JSON.stringify(inventoryItems)
        };

        // رابط Google Apps Script Web App
        const scriptURL = "https://script.google.com/macros/s/AKfycbzkdZ5k6EChKCDiNxKWXH6QjB4tZX7xX-T1Nn7hDNSRA_NI_KsXA7IF1Rpjq09Ow249zw/exec";

        statusMessage.textContent = "⏳ جاري إرسال البيانات...";
        statusMessage.className = "status loading";

        fetch(scriptURL, {
            method: "POST",
            body: new URLSearchParams(formData)
        })
        .then(response => response.text())
        .then(result => {
            if (result.includes("Success")) {
                statusMessage.textContent = "✅ تم إرسال البيانات بنجاح";
                statusMessage.className = "status success";
                form.reset();
                inventoryContainer.innerHTML = "";
                addInventoryRow();
            } else {
                statusMessage.textContent = "⚠️ حدث خطأ: " + result;
                statusMessage.className = "status error";
            }
        })
        .catch(error => {
            console.error("Error!", error);
            statusMessage.textContent = "❌ فشل الإرسال: " + error;
            statusMessage.className = "status error";
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = "🚀 إرسال البيانات";
        });
    });
});
