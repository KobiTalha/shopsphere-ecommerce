const quantityInput = document.getElementById("quantity");
const priceInput = document.getElementById("price");
const totalPriceElement = document.getElementById("totalPrice");
const couponMessageElement = document.getElementById("couponMessage");
const deliveryChargeElement = document.getElementById("deliveryCharge");
const grandTotalElement = document.getElementById("grandTotal");
const termsCheckbox = document.getElementById("termsCheckbox");
const submitButton = document.getElementById("submitButton");
const deliveryOptions = document.querySelectorAll('input[name="deliveryArea"]');
const checkoutForm = document.getElementById("checkoutForm");

function getCartTotal() {
    const quantity = Number(quantityInput.value) || 0;
    const price = Number(priceInput.value) || 0;
    return quantity * price;
}

function getDeliveryCharge() {
    const selectedOption = document.querySelector('input[name="deliveryArea"]:checked');
    return selectedOption && selectedOption.value === "outside" ? 150 : 50;
}

function updateCartSummary() {
    const cartTotal = getCartTotal();
    totalPriceElement.textContent = cartTotal;

    if (cartTotal > 2000) {
        couponMessageElement.textContent = "You have received a coupon.";
    } else {
        couponMessageElement.textContent = "";
    }

    updateGrandTotal();
}

function updateGrandTotal() {
    const cartTotal = getCartTotal();
    const deliveryCharge = getDeliveryCharge();
    const grandTotal = cartTotal + deliveryCharge;

    deliveryChargeElement.textContent = deliveryCharge;
    grandTotalElement.textContent = grandTotal;
}

function toggleSubmitButton() {
    submitButton.classList.toggle("hidden", !termsCheckbox.checked);
}

quantityInput.addEventListener("input", updateCartSummary);
priceInput.addEventListener("input", updateCartSummary);
deliveryOptions.forEach((option) => {
    option.addEventListener("change", updateGrandTotal);
});
termsCheckbox.addEventListener("change", toggleSubmitButton);

checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Order submitted successfully.");
});

updateCartSummary();
toggleSubmitButton();
