document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("visitForm");
    const addInventoryBtn = document.getElementById("addInventoryBtn");
    const inventoryContainer = document.getElementById("inventoryContainer");
    const inventoryTemplate = document.getElementById("inventoryTemplate");
    const statusMessage = document.getElementById("statusMessage");

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

    addInventoryBtn.addEventListener("click", () => {
        addInventoryRow();
    });

    // حساب الكمية الإجمالية بالباكت
    function calculateTotal(cartonQty, packetQty, packetsPerCarton) {
        return (cartonQty * packetsPerCarton) + packetQty;
    }

    // دمج المنتجات المتكررة
    function mergeProducts(products) {
        const merged = {};
        const notes = [];

        products.forEach(p => {
            const key = p.code || p.name; // المفتاح = الكود أو الاسم
            if (!merged[key]) {
                merged[key] = { ...p };
            } else {
                // دمج الكميات
                merged[key].cartonQty += p.cartonQty;
                merged[key].packetQty += p.packetQty;
                merged[key].total += p.total;
                notes.push(`تم دمج المنتج: ${p.name} → الكمية النهائية ${merged[key].total} باكت`);
            }
        });

        return { merged: Object.values(merged), notes };
    }

    // إرسال النموذج
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        statusMessage.textContent = "جاري الإرسال...";
        statusMessage.className = "status loading";

        // جمع بيانات الجرد
        const items = [...inventoryContainer.querySelectorAll(".inventory-item")];
        if (items.length === 0) {
            statusMessage.textContent = "❌ يجب إضافة منتج واحد على الأقل";
            statusMessage.className = "status error";
            return;
        }

        const products = [];
        let valid = true;

        items.forEach(item => {
            const name = item.querySelector('input[name="productName[]"]').value.trim();
            const code = item.querySelector('input[name="productCode[]"]').value.trim();
            const category = item.querySelector('input[name="productCategory[]"]').value.trim();
            const cartonQty = parseInt(item.querySelector('input[name="cartonQty[]"]').value) || 0;
            const packetQty = parseInt(item.querySelector('input[name="packetQty[]"]').value) || 0;
            const packetsPerCarton = parseInt(item.querySelector('input[name="packetsPerCarton[]"]').value) || 1;
            const expiryDate = item.querySelector('input[name="expiryDate[]"]').value;

            if (!name) {
                valid = false;
                return;
            }

            const total = calculateTotal(cartonQty, packetQty, packetsPerCarton);

            if (total === 0) {
                valid = false;
                return;
            }

            products.push({
                name,
                code,
                category,
                cartonQty,
                packetQty,
                packetsPerCarton,
                expiryDate,
                total
            });
        });

        if (!valid) {
            statusMessage.textContent = "❌ تأكد من إدخال اسم المنتج والكمية بشكل صحيح";
            statusMessage.className = "status error";
            return;
        }

        // دمج المنتجات المتكررة
        const { merged, notes } = mergeProducts(products);

        // جمع باقي بيانات النموذج
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
            products: merged
        };

        try {
            // هنا تضع رابط Google Apps Script أو API
            // const response = await fetch("YOUR_SCRIPT_URL", {
            //     method: "POST",
            //     body: JSON.stringify(formData),
            //     headers: { "Content-Type": "application/json" }
            // });

            // const result = await response.json();

            // محاكاة نجاح الإرسال
            await new Promise(res => setTimeout(res, 1000));

            statusMessage.textContent = "✅ تم إرسال التقرير بنجاح";
            statusMessage.className = "status success";

            if (notes.length > 0) {
                alert(notes.join("\n"));
            }

            form.reset();
            inventoryContainer.innerHTML = "";
            addInventoryRow();

        } catch (error) {
            console.error(error);
            statusMessage.textContent = "❌ حدث خطأ أثناء الإرسال";
            statusMessage.className = "status error";
        }
    });
});
