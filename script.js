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
            const key = p.code || p.name;
            if (!merged[key]) {
                merged[key] = { ...p };
            } else {
                merged[key].cartonQty += p.cartonQty;
                merged[key].packetQty += p.packetQty;
                merged[key].total += p.total;
                notes.push(`تم دمج المنتج: ${p.name} → الكمية النهائية ${merged[key].total} باكت`);
            }
        });

        return { merged: Object.values(merged), notes };
    }

    // تحميل بيانات JSON
    fetch("sales_representatives.json")
      .then(res => res.json())
      .then(data => {
          const select = document.getElementById("salesRepName");
          data.forEach(rep => {
              const option = document.createElement("option");
              option.value = rep.name;
              option.textContent = rep.name;
              select.appendChild(option);
          });
      });

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

    fetch("customers_main.json")
      .then(res => res.json())
      .then(data => {
          const datalist = document.getElementById("customersList");
          data.forEach(cust => {
              const option = document.createElement("option");
              option.value = cust.name;
              option.dataset.code = cust.code;
              datalist.appendChild(option);
          });

          document.getElementById("customerNameInput").addEventListener("input", (e) => {
              const selected = data.find(c => c.name === e.target.value);
              document.getElementById("customerCode").value = selected ? selected.code : "";
          });
      });

    fetch("products.json")
      .then(res => res.json())
      .then(data => {
          const datalist = document.getElementById("productsList");
          data.forEach(prod => {
              const option = document.createElement("option");
              option.value = prod.name;
              option.dataset.code = prod.code;
              option.dataset.category
