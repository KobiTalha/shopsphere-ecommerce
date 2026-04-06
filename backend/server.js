const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const frontendDir = path.join(__dirname, "..", "frontend");
const dataDir = path.join(__dirname, "data");
const productsFile = path.join(dataDir, "products.json");
const cartFile = path.join(dataDir, "cart.json");
const COUPON_CODE = "SAVE200";

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.static(frontendDir));

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function normalizeDeliveryArea(value) {
  return value === "outside" ? "outside" : "inside";
}

function normalizeCouponCode(value) {
  return String(value || "").trim().toUpperCase();
}

function calculateCartSummary(cartItems, products, deliveryArea = "inside", couponCode = "") {
  const enrichedItems = cartItems
    .map((item) => {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) {
        return null;
      }

      return {
        productId: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: item.quantity,
        itemTotal: product.price * item.quantity
      };
    })
    .filter(Boolean);

  const subtotal = enrichedItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const normalizedDeliveryArea = normalizeDeliveryArea(deliveryArea);
  const normalizedCouponCode = normalizeCouponCode(couponCode);
  const deliveryCharge = normalizedDeliveryArea === "outside" ? 150 : 50;
  const couponEligible = subtotal > 2000;
  const couponApplied = couponEligible && normalizedCouponCode === COUPON_CODE;
  const discount = couponApplied ? 200 : 0;
  const total = subtotal + deliveryCharge - discount;

  return {
    items: enrichedItems,
    subtotal,
    deliveryArea: normalizedDeliveryArea,
    deliveryCharge,
    couponEligible,
    couponCode: couponApplied ? COUPON_CODE : "",
    discount,
    total
  };
}

function validateCheckoutPayload(body) {
  const errors = [];
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  const deliveryArea = normalizeDeliveryArea(body.deliveryArea);
  const acceptedTerms = body.acceptedTerms === true;

  if (name.length < 3) {
    errors.push("Name must be at least 3 characters.");
  }

  if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(phone)) {
    errors.push("Phone number must be a valid Bangladesh mobile number.");
  }

  if (address.length < 10) {
    errors.push("Address must be at least 10 characters.");
  }

  if (!acceptedTerms) {
    errors.push("Terms and conditions must be accepted.");
  }

  return {
    errors,
    sanitized: {
      name,
      phone,
      address,
      deliveryArea,
      couponCode: normalizeCouponCode(body.couponCode),
      acceptedTerms
    }
  };
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/products", async (req, res) => {
  try {
    const query = String(req.query.search || "").trim().toLowerCase();
    const products = await readJson(productsFile);
    const filtered = query
      ? products.filter((product) => {
          return [product.name, product.category, product.description]
            .join(" ")
            .toLowerCase()
            .includes(query);
        })
      : products;

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: "Failed to load products." });
  }
});

app.get("/api/cart", async (req, res) => {
  try {
    const [products, cart] = await Promise.all([readJson(productsFile), readJson(cartFile)]);
    const summary = calculateCartSummary(cart, products, req.query.deliveryArea, req.query.couponCode);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: "Failed to load cart." });
  }
});

app.post("/api/cart", async (req, res) => {
  try {
    const productId = String(req.body.productId || "");
    const quantity = Number(req.body.quantity || 1);

    if (!productId || quantity < 1) {
      return res.status(400).json({ message: "Valid product and quantity are required." });
    }

    const [products, cart] = await Promise.all([readJson(productsFile), readJson(cartFile)]);
    const product = products.find((entry) => entry.id === productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const existingItem = cart.find((item) => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ productId, quantity });
    }

    await writeJson(cartFile, cart);

    const summary = calculateCartSummary(cart, products);
    res.status(201).json(summary);
  } catch (error) {
    res.status(500).json({ message: "Failed to update cart." });
  }
});

app.patch("/api/cart/:productId", async (req, res) => {
  try {
    const productId = String(req.params.productId || "");
    const quantity = Number(req.body.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be an integer greater than 0." });
    }

    const [products, cart] = await Promise.all([readJson(productsFile), readJson(cartFile)]);
    const item = cart.find((entry) => entry.productId === productId);

    if (!item) {
      return res.status(404).json({ message: "Cart item not found." });
    }

    item.quantity = quantity;
    await writeJson(cartFile, cart);

    res.json(calculateCartSummary(cart, products));
  } catch (error) {
    res.status(500).json({ message: "Failed to update cart item." });
  }
});

app.delete("/api/cart/:productId", async (req, res) => {
  try {
    const productId = String(req.params.productId || "");
    const [products, cart] = await Promise.all([readJson(productsFile), readJson(cartFile)]);
    const filteredCart = cart.filter((item) => item.productId !== productId);

    await writeJson(cartFile, filteredCart);

    res.json(calculateCartSummary(filteredCart, products));
  } catch (error) {
    res.status(500).json({ message: "Failed to remove cart item." });
  }
});

app.post("/api/checkout", async (req, res) => {
  try {
    const [products, cart] = await Promise.all([readJson(productsFile), readJson(cartFile)]);
    if (cart.length === 0) {
      return res.status(400).json({ message: "Your cart is empty." });
    }

    const { errors, sanitized } = validateCheckoutPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const summary = calculateCartSummary(
      cart,
      products,
      sanitized.deliveryArea,
      sanitized.couponCode
    );

    await writeJson(cartFile, []);

    res.json({
      message: "Order placed successfully.",
      customer: {
        name: sanitized.name,
        phone: sanitized.phone,
        address: sanitized.address
      },
      summary
    });
  } catch (error) {
    res.status(500).json({ message: "Checkout failed." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
