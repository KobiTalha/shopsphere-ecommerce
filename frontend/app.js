const state = {
  products: [],
  categories: [],
  cart: null,
  searchTerm: "",
  category: "",
  sortBy: "featured",
  activeProductIds: new Set()
};

const elements = {
  productGrid: document.getElementById("productGrid"),
  resultCount: document.getElementById("resultCount"),
  categoryRow: document.getElementById("categoryRow"),
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
  searchButton: document.querySelector("#searchForm button"),
  clearSearchButton: document.getElementById("clearSearchButton"),
  sortSelect: document.getElementById("sortSelect"),
  cartPanel: document.getElementById("cartPanel"),
  cartOverlay: document.getElementById("cartOverlay"),
  cartTrigger: document.getElementById("cartTrigger"),
  clearCartButton: document.getElementById("clearCartButton"),
  panelClose: document.getElementById("panelClose"),
  checkoutForm: document.getElementById("checkoutForm"),
  termsCheckbox: document.getElementById("termsCheckbox"),
  submitButton: document.getElementById("submitButton"),
  formFeedback: document.getElementById("formFeedback")
};

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-BD")} TK`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function syncCatalogQuery() {
  const params = new URLSearchParams();

  if (state.searchTerm) {
    params.set("search", state.searchTerm);
  }

  if (state.category) {
    params.set("category", state.category);
  }

  if (state.sortBy && state.sortBy !== "featured") {
    params.set("sort", state.sortBy);
  }

  const nextUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

function hydrateCatalogStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  state.searchTerm = params.get("search") || "";
  state.category = params.get("category") || "";
  state.sortBy = params.get("sort") || "featured";
  elements.searchInput.value = state.searchTerm;
  elements.sortSelect.value = state.sortBy;
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
              <span>${product.shippingEta || "Fast shipping"}</span>
            </div>
            <div class="stock-row">
              <span class="stock-label ${product.stock > 0 ? "in-stock" : "out-of-stock"}">
                ${product.stock > 0 ? `${product.stock} left` : "Out of stock"}
              </span>
            </div>
            <button
              class="add-button"
              type="button"
              data-product-id="${product.id}"
              ${state.activeProductIds.has(product.id) || product.stock < 1 ? "disabled" : ""}
            >
              ${product.stock > 0 ? "Add to cart" : "Unavailable"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCategories(categories) {
  state.categories = categories;
  const allCategories = ["All", ...categories];
  elements.categoryRow.innerHTML = allCategories
    .map((category) => {
      const value = category === "All" ? "" : category;
      const isActive = state.category === value;

      return `
        <button
          class="category-chip${isActive ? " active" : ""}"
          type="button"
          data-category="${value}"
        >
          ${category}
        </button>
      `;
    })
    .join("");
}

function renderProductLoading(search = "") {
  elements.resultCount.textContent = "Searching...";
  elements.productGrid.innerHTML = `
    <p class="cart-empty loading-state">
      Looking for ${search ? `<strong>${escapeHtml(search)}</strong>` : "all products"}...
    </p>
  `;
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
                <button
                  type="button"
                  data-action="decrease"
                  data-product-id="${item.productId}"
                  ${state.activeProductIds.has(item.productId) ? "disabled" : ""}
                >
                  −
                </button>
                <span>${item.quantity}</span>
                <button
                  type="button"
                  data-action="increase"
                  data-product-id="${item.productId}"
                  ${state.activeProductIds.has(item.productId) ? "disabled" : ""}
                >
                  +
                </button>
              </div>
              <button
                class="remove-button"
                type="button"
                data-action="remove"
                data-product-id="${item.productId}"
                ${state.activeProductIds.has(item.productId) ? "disabled" : ""}
              >
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
  state.searchTerm = search;
  renderProductLoading(search);
  const params = new URLSearchParams();
  if (search) {
    params.set("search", search);
  }
  if (state.category) {
    params.set("category", state.category);
  }
  if (state.sortBy && state.sortBy !== "featured") {
    params.set("sort", state.sortBy);
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const products = await requestJson(`/api/products${query}`);
  state.products = products;
  renderProducts(products);
  syncCatalogQuery();
}

async function loadCategories() {
  const categories = await requestJson("/api/categories");
  renderCategories(categories);
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

async function clearCart() {
  await requestJson("/api/cart", {
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
  const note = document.getElementById("customerNote").value.trim();

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

  if (note.length > 160) {
    return "Keep the delivery note within 160 characters.";
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
    setCheckoutPending(true);
    const payload = {
      name: document.getElementById("customerName").value.trim(),
      phone: document.getElementById("customerPhone").value.trim(),
      address: document.getElementById("customerAddress").value.trim(),
      note: document.getElementById("customerNote").value.trim(),
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
  } finally {
    setCheckoutPending(false);
  }
}

function toggleSubmitButton() {
  elements.submitButton.disabled = !elements.termsCheckbox.checked;
}

function setCheckoutPending(isPending) {
  elements.submitButton.disabled = isPending || !elements.termsCheckbox.checked;
  elements.submitButton.textContent = isPending ? "Placing order..." : "Place order";
  elements.checkoutForm.classList.toggle("is-submitting", isPending);
}

function setSearchPending(isPending) {
  elements.searchInput.setAttribute("aria-busy", String(isPending));
  elements.searchButton.disabled = isPending;
  elements.searchButton.textContent = isPending ? "Searching..." : "Search";
  elements.clearSearchButton.disabled = isPending;
}

function setCartPanelOpen(isOpen) {
  elements.cartPanel.classList.toggle("open", isOpen);
  elements.cartPanel.setAttribute("aria-hidden", String(!isOpen && window.innerWidth <= 780));
  elements.cartTrigger.setAttribute("aria-expanded", String(isOpen));
  elements.cartOverlay.hidden = !isOpen || window.innerWidth > 780;
  document.body.classList.toggle("cart-open", isOpen && window.innerWidth <= 780);
}

function syncProductActionState(productId) {
  document.querySelectorAll(`[data-product-id="${productId}"]`).forEach((button) => {
    button.disabled = state.activeProductIds.has(productId);
  });
}

async function withProductAction(productId, action) {
  if (state.activeProductIds.has(productId)) {
    return;
  }

  state.activeProductIds.add(productId);
  syncProductActionState(productId);

  try {
    await action();
  } finally {
    state.activeProductIds.delete(productId);
    syncProductActionState(productId);
  }
}

let searchDebounceId = 0;

async function runSearch(search) {
  setSearchPending(true);

  try {
    await loadProducts(search);
  } catch (error) {
    setFeedback(error.message, "error");
  } finally {
    setSearchPending(false);
  }
}

elements.searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearTimeout(searchDebounceId);
  await runSearch(elements.searchInput.value.trim());
});

elements.searchInput.addEventListener("input", () => {
  elements.clearSearchButton.hidden = elements.searchInput.value.trim() === "";
  clearTimeout(searchDebounceId);
  searchDebounceId = window.setTimeout(() => {
    runSearch(elements.searchInput.value.trim());
  }, 250);
});

elements.clearSearchButton.addEventListener("click", async () => {
  elements.searchInput.value = "";
  elements.clearSearchButton.hidden = true;
  await runSearch("");
});

elements.sortSelect.addEventListener("change", async () => {
  state.sortBy = elements.sortSelect.value;
  await runSearch(elements.searchInput.value.trim());
});

elements.categoryRow.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) {
    return;
  }

  state.category = button.dataset.category;
  renderCategories(state.categories);
  await runSearch(elements.searchInput.value.trim());
});

elements.productGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-product-id]");
  if (!button || button.disabled) {
    return;
  }

  try {
    await withProductAction(button.dataset.productId, () => addToCart(button.dataset.productId));
    setFeedback("Product added to cart.", "success");
  } catch (error) {
    setFeedback(error.message, "error");
  }
});

elements.cartItems.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled || !state.cart) {
    return;
  }

  const { action, productId } = button.dataset;
  const item = state.cart.items.find((entry) => entry.productId === productId);
  if (!item) {
    return;
  }

  try {
    await withProductAction(productId, async () => {
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
    });
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
  setCartPanelOpen(true);
});

elements.panelClose.addEventListener("click", () => {
  setCartPanelOpen(false);
});

elements.clearCartButton.addEventListener("click", async () => {
  if (!state.cart || state.cart.items.length === 0) {
    return;
  }

  try {
    await clearCart();
    setFeedback("Cart cleared.", "success");
  } catch (error) {
    setFeedback(error.message, "error");
  }
});

elements.cartOverlay.addEventListener("click", () => {
  setCartPanelOpen(false);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 780) {
    setCartPanelOpen(false);
  }
});

window.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "")
  ) {
    event.preventDefault();
    elements.searchInput.focus();
  }

  if (event.key === "Escape") {
    setCartPanelOpen(false);
  }
});

async function init() {
  try {
    hydrateCatalogStateFromUrl();
    await Promise.all([loadCategories(), loadProducts(), refreshCart()]);
    elements.clearSearchButton.hidden = state.searchTerm === "";
    setCartPanelOpen(false);
    toggleSubmitButton();
  } catch (error) {
    setFeedback("Failed to load the storefront.", "error");
  }
}

init();
