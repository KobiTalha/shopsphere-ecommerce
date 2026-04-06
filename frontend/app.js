const state = {
  products: [],
  cart: null
};

const elements = {
  productGrid: document.getElementById("productGrid"),
  resultCount: document.getElementById("resultCount"),
  cartItems: document.getElementById("cartItems"),
  cartCount: document.getElementById("cartCount"),
  subtotalValue: document.getElementById("subtotalValue"),
  deliveryValue: document.getElementById("deliveryValue"),
  discountValue: document.getElementById("discountValue"),
  totalValue: document.getElementById("totalValue"),
  couponMessage: document.getElementById("couponMessage"),
  checkoutTotal: document.getElementById("checkoutTotal"),
  couponHint: document.getElementById("couponHint"),
  couponInput: document.getElementById("couponInput"),
  searchInput: document.getElementById("searchInput"),
  searchForm: document.getElementById("searchForm"),
  cartPanel: document.getElementById("cartPanel"),
  cartTrigger: document.getElementById("cartTrigger"),
  panelClose: document.getElementById("panelClose"),
  checkoutForm: document.getElementById("checkoutForm"),
  termsCheckbox: document.getElementById("termsCheckbox"),
  submitButton: document.getElementById("submitButton"),
  formFeedback: document.getElementById("formFeedback")
};

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-BD")} TK`;
}

function getDeliveryArea() {
  const selected = document.querySelector('input[name="deliveryArea"]:checked');
  return selected ? selected.value : "inside";
}

function getCouponCode() {
  return elements.couponInput.value.trim().toUpperCase();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function renderProducts(products) {
  elements.resultCount.textContent = `${products.length} items`;

  if (products.length === 0) {
    elements.productGrid.innerHTML = '<p class="cart-empty">No products matched your search.</p>';
    return;
  }

  elements.productGrid.innerHTML = products
    .map((product) => {
      return `
        <article class="product-card">
          <span class="badge">${product.badge}</span>
          <div class="product-media">
            <img src="${product.image}" alt="${product.name}" />
          </div>
          <div class="product-body">
            <span class="category">${product.category}</span>
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="price-row">
              <strong>${formatCurrency(product.price)}</strong>
              <del>${formatCurrency(product.originalPrice)}</del>
            </div>
            <div class="rating-row">
              <span>Rating ${product.rating} / 5</span>
              <span>Fast shipping</span>
            </div>
            <button class="add-button" type="button" data-product-id="${product.id}">
              Add to cart
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCart(summary) {
  state.cart = summary;
  const itemCount = summary.items.reduce((sum, item) => sum + item.quantity, 0);
  elements.cartCount.textContent = String(itemCount);
  elements.subtotalValue.textContent = formatCurrency(summary.subtotal);
  elements.deliveryValue.textContent = formatCurrency(summary.deliveryCharge);
  elements.discountValue.textContent = formatCurrency(summary.discount);
  elements.totalValue.textContent = formatCurrency(summary.total);
  elements.checkoutTotal.textContent = formatCurrency(summary.total);

  if (summary.items.length === 0) {
    elements.cartItems.innerHTML =
      '<p class="cart-empty">Your cart is empty. Add a few products to continue.</p>';
  } else {
    elements.cartItems.innerHTML = summary.items
      .map((item) => {
        return `
          <article class="cart-item">
            <img src="${item.image}" alt="${item.name}" />
            <div>
              <h3>${item.name}</h3>
              <div class="cart-meta">
                <span>${formatCurrency(item.price)}</span>
                <strong>${formatCurrency(item.itemTotal)}</strong>
              </div>
              <div class="quantity-controls">
                <button type="button" data-action="decrease" data-product-id="${item.productId}">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-action="increase" data-product-id="${item.productId}">+</button>
              </div>
              <button class="remove-button" type="button" data-action="remove" data-product-id="${item.productId}">
                Remove
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  if (summary.couponEligible) {
    elements.couponMessage.innerHTML =
      'Coupon unlocked. Use <strong>SAVE200</strong> to save 200 TK on this order.';
    elements.couponHint.innerHTML =
      'Eligible for discount. Enter <strong>SAVE200</strong> to apply the coupon.';
  } else {
    const remaining = 2001 - summary.subtotal;
    elements.couponMessage.innerHTML =
      'Spend more than 2000 TK to unlock coupon code <strong>SAVE200</strong>.';
    elements.couponHint.textContent =
      remaining > 0
        ? `Add ${formatCurrency(remaining)} more to activate the coupon.`
        : "Coupon becomes valid when subtotal is more than 2000 TK.";
  }
}

async function loadProducts(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const products = await requestJson(`/api/products${query}`);
  state.products = products;
  renderProducts(products);
}

async function refreshCart() {
  const params = new URLSearchParams({
    deliveryArea: getDeliveryArea(),
    couponCode: getCouponCode()
  });
  const cart = await requestJson(`/api/cart?${params.toString()}`);
  renderCart(cart);
}

async function addToCart(productId) {
  await requestJson("/api/cart", {
    method: "POST",
    body: JSON.stringify({ productId, quantity: 1 })
  });
  await refreshCart();
}

async function updateCartItem(productId, nextQuantity) {
  await requestJson(`/api/cart/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity: nextQuantity })
  });
  await refreshCart();
}

async function removeCartItem(productId) {
  await requestJson(`/api/cart/${productId}`, {
    method: "DELETE"
  });
  await refreshCart();
}

function setFeedback(message, type = "") {
  elements.formFeedback.textContent = message;
  elements.formFeedback.className = "form-feedback";
  if (type) {
    elements.formFeedback.classList.add(type);
  }
}

function validateCheckoutForm() {
  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const address = document.getElementById("customerAddress").value.trim();

  if (!state.cart || state.cart.items.length === 0) {
    return "Add at least one product before checkout.";
  }

  if (name.length < 3) {
    return "Enter a valid full name.";
  }

  if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(phone)) {
    return "Enter a valid Bangladesh phone number.";
  }

  if (address.length < 10) {
    return "Enter a complete delivery address.";
  }

  return "";
}

async function submitCheckout(event) {
  event.preventDefault();
  const validationError = validateCheckoutForm();

  if (validationError) {
    setFeedback(validationError, "error");
    return;
  }

  if (!elements.termsCheckbox.checked) {
    setFeedback("Accept the terms and conditions to continue.", "error");
    return;
  }

  try {
    const payload = {
      name: document.getElementById("customerName").value.trim(),
      phone: document.getElementById("customerPhone").value.trim(),
      address: document.getElementById("customerAddress").value.trim(),
      deliveryArea: getDeliveryArea(),
      couponCode: getCouponCode(),
      acceptedTerms: elements.termsCheckbox.checked
    };

    const result = await requestJson("/api/checkout", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    setFeedback(
      `${result.message} Final total: ${formatCurrency(result.summary.total)}.`,
      "success"
    );
    elements.checkoutForm.reset();
    document.querySelector('input[name="deliveryArea"][value="inside"]').checked = true;
    elements.submitButton.disabled = true;
    await refreshCart();
  } catch (error) {
    setFeedback(error.message, "error");
  }
}

function toggleSubmitButton() {
  elements.submitButton.disabled = !elements.termsCheckbox.checked;
}

elements.searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadProducts(elements.searchInput.value.trim());
});

elements.productGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-product-id]");
  if (!button) {
    return;
  }

  try {
    await addToCart(button.dataset.productId);
    setFeedback("Product added to cart.", "success");
  } catch (error) {
    setFeedback(error.message, "error");
  }
});

elements.cartItems.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || !state.cart) {
    return;
  }

  const { action, productId } = button.dataset;
  const item = state.cart.items.find((entry) => entry.productId === productId);
  if (!item) {
    return;
  }

  try {
    if (action === "increase") {
      await updateCartItem(productId, item.quantity + 1);
    }

    if (action === "decrease") {
      if (item.quantity === 1) {
        await removeCartItem(productId);
      } else {
        await updateCartItem(productId, item.quantity - 1);
      }
    }

    if (action === "remove") {
      await removeCartItem(productId);
    }
  } catch (error) {
    setFeedback(error.message, "error");
  }
});

document.querySelectorAll('input[name="deliveryArea"]').forEach((input) => {
  input.addEventListener("change", refreshCart);
});

elements.couponInput.addEventListener("input", refreshCart);
elements.termsCheckbox.addEventListener("change", toggleSubmitButton);
elements.checkoutForm.addEventListener("submit", submitCheckout);

elements.cartTrigger.addEventListener("click", () => {
  elements.cartPanel.classList.add("open");
});

elements.panelClose.addEventListener("click", () => {
  elements.cartPanel.classList.remove("open");
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 780) {
    elements.cartPanel.classList.remove("open");
  }
});

async function init() {
  try {
    await Promise.all([loadProducts(), refreshCart()]);
    toggleSubmitButton();
  } catch (error) {
    setFeedback("Failed to load the storefront.", "error");
  }
}

init();
// update 1
// update 2
// update 3
// update 4
// update 5
// update 6
// update 7
// update 8
// update 9
