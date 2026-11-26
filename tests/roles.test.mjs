import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
// Compile application TypeScript in memory for Node's test runner.
Module._extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
};
const { requireRole, validateUser, validateStock, validateProduct, normalizeCategory } = require("../src/utils/administracion.ts");
const user = { name: "Prueba", apellido: "Roles", email: "roles@duoc.cl", birthDate: "2000-01-01", direccion: "Prueba 123", genero: "otro", phone: "", region: "Metropolitana de Santiago", comuna: "Santiago", password: "Prueba123", role: "Cliente", failedAttempts: 0, locked: false };
test("solo administrador puede usar operaciones administrativas", () => {
  for (const role of [undefined, "Cliente", "Vendedor"]) assert.throws(() => requireRole(role, ["Administrador"]));
  assert.doesNotThrow(() => requireRole("Administrador", ["Administrador"]));
});
test("stock permite vendedor y administrador, bloquea cliente e invitado", () => {
  for (const role of ["Administrador", "Vendedor"]) assert.doesNotThrow(() => requireRole(role, ["Administrador", "Vendedor"]));
  for (const role of [undefined, "Cliente"]) assert.throws(() => requireRole(role, ["Administrador", "Vendedor"]));
});
test("categorías aceptan acentos y mayúsculas, rechazan números y símbolos", () => {
  assert.equal(normalizeCategory("  nutrición  "), "NUTRICIÓN");
  for (const value of ["ab", "abc1", "abc-", "   "]) assert.throws(() => normalizeCategory(value));
});
test("stock admite cero, rechaza negativos, fracciones y valores no finitos", () => {
  for (const value of [0, 12]) assert.doesNotThrow(() => validateStock(value));
  for (const value of [-1, 0.5, NaN, Infinity]) assert.throws(() => validateStock(value));
});
test("productos validan distribuidora, precio y pertenencia a categoría", () => {
  const product = { name: "VET 123", distributor: "DISTRIBUIDORA SUR", price: 100, stock: 0, category: "VACUNAS" };
  assert.doesNotThrow(() => validateProduct(product, ["VACUNAS"]));
  for (const patch of [{ name: "A!B" }, { name: "Vet<script>" }, { distributor: "ab" }, { price: 99 }, { price: 100.5 }, { category: "OTRA" }]) assert.throws(() => validateProduct({ ...product, ...patch }, ["VACUNAS"]));
  // Símbolos comunes en nombres de medicamentos
  for (const name of ["Vetmedin 2.5mg", "Omega vet 3-6-9", "Amoxicilina + Ác. clavulánico (500mg)", "Lab. O'Brien & Cía"]) assert.doesNotThrow(() => validateProduct({ ...product, name }, ["VACUNAS"]));
});
test("usuarios reutilizan restricciones existentes", () => {
  assert.doesNotThrow(() => validateUser(user, []));
  for (const patch of [{ email: "a@example.com" }, { password: "minuscula" }, { birthDate: "2020-01-01" }, { phone: "1234" }, { name: "" }, { region: "" }, { role: "otro" }]) assert.throws(() => validateUser({ ...user, ...patch }, []));
});
test("duplicados no distinguen mayúsculas y editar no duplica el propio usuario", () => {
  assert.throws(() => validateUser({ ...user, email: "ROLES@DUOC.CL" }, [user]));
  assert.doesNotThrow(() => validateUser(user, [user], user.email));
  assert.throws(() => validateUser({ ...user, email: "otro@duoc.cl" }, [user]));
});

Module._extensions[".tsx"] = Module._extensions[".ts"];
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { AppProvider } = require("../src/context/AppProvider.tsx");
const { useApp } = require("../src/context/AppContext.ts");
const { matchesProductName } = require("../src/utils/productSearch.ts");
test("vendedor crea y edita productos y stock, pero no administra usuarios ni elimina productos", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = new Map();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } });
  try {
    storage.set("clinica-nutridifs-profiles", JSON.stringify([{ ...user, role: "Vendedor" }]));
    storage.set("clinica-nutridifs-session", JSON.stringify({ ...user, role: "Vendedor" }));
    let app;
    function Probe() { app = useApp(); return null; }
    const refresh = () => renderToStaticMarkup(createElement(AppProvider, null, createElement(Probe)));
    refresh();
    const product = { ...app.products[0], id: "prueba-vendedor", name: "Producto nuevo", distributor: "VetSur", price: 1000, stock: 2 };
    app.saveProduct(product);
    refresh();
    assert.equal(app.products.find(p => p.id === product.id).name, "Producto nuevo");
    app.saveProduct({ ...product, name: "Producto editado", price: 2000 });
    refresh();
    assert.equal(app.products.find(p => p.id === product.id).price, 2000);
    app.updateStock(product.id, 7);
    refresh();
    assert.equal(app.products.find(p => p.id === product.id).stock, 7);
    assert.throws(() => app.manageUser(user), /permiso/);
    assert.throws(() => app.manageUser(user, user.email), /permiso/);
    assert.throws(() => app.deleteUser(user.email), /permiso/);
    assert.throws(() => app.deleteProduct(product.id), /permiso/);
    assert.throws(() => app.saveCategory("NUEVA"), /permiso/);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});
test("búsqueda por nombre admite coincidencias parciales, tildes, mayúsculas y espacios", () => {
  assert.equal(matchesProductName("Antibiótico Veterinario", "  ANTIBIOTICO  "), true);
  assert.equal(matchesProductName("Antibiótico Veterinario", "veter"), true);
  assert.equal(matchesProductName("Vacuna", ""), true);
  assert.equal(matchesProductName("Vacuna", "antibiotico"), false);
});

test("todos los roles editan su perfil, conservan credenciales y persisten el correo nuevo", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = new Map();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } });
  try {
    let app;
    function Probe() { app = useApp(); return null; }
    const refresh = () => renderToStaticMarkup(createElement(AppProvider, null, createElement(Probe)));
    for (const role of ["Cliente", "Vendedor", "Administrador"]) {
      const other = { ...user, email: "otro@duoc.cl", password: "Otra123" };
      storage.set("clinica-nutridifs-profiles", JSON.stringify([{ ...user, role }, other]));
      storage.set("clinica-nutridifs-session", JSON.stringify({ ...user, role }));
      refresh();
      for (const patch of [{ name: "" }, { apellido: "" }, { email: "a@example.com" }, { birthDate: "2020-01-01" }, { phone: "1234" }, { direccion: "" }, { region: "" }, { comuna: "" }, { genero: "" }]) {
        assert.throws(() => app.updateProfile({ ...user, ...patch }));
      }
      assert.throws(() => app.updateProfile({ ...user, email: "OTRO@DUOC.CL" }), /registrado/);
      app.updateProfile({ ...user, name: " Editado ", email: "NUEVO@DUOC.CL", direccion: "Nueva 123", password: "Cambiada123", role: "Administrador", locked: true });
      refresh();
      const updated = app.profiles.find(p => p.email === "nuevo@duoc.cl");
      assert.equal(updated.name, "Editado");
      assert.equal(updated.direccion, "Nueva 123");
      assert.equal(updated.password, user.password);
      assert.equal(updated.role, role);
      assert.equal(updated.locked, false);
      assert.equal(app.session.role, role);
      assert.equal(app.session.email, "nuevo@duoc.cl");
      assert.deepEqual(app.profiles.find(p => p.email === other.email), other);
      app.logout();
      refresh();
      assert.throws(() => app.updateProfile(user), /sesión/);
      assert.throws(() => app.authenticate(user.email, user.password), /No existe/);
      app.authenticate("nuevo@duoc.cl", user.password);
      refresh();
      assert.equal(app.session.name, "Editado");
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});

// Render every public route with realistic persisted sessions, without touching browser data.
Module._extensions[".css"] = () => {};
const { MemoryRouter } = require("react-router");
const { default: App } = require("../src/App.tsx");
const publicRoutes = ["/", "/consultas", "/productos", "/blog", "/contactanos", "/quienes-somos", "/perfil", "/carrito", "/login", "/registro", "/agendar"];
for (const role of [null, "Cliente", "Vendedor", "Administrador"]) {
  test(`todas las páginas públicas se renderizan con sesión ${role || "invitado"}`, () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const storage = new Map();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    } });
    try {
      storage.set("clinica-nutridifs-profiles", JSON.stringify([{ ...user, role: role || "Cliente" }]));
      if (role) storage.set("clinica-nutridifs-session", JSON.stringify({ ...user, role }));
      for (const route of publicRoutes) {
        const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [route] }, createElement(AppProvider, null, createElement(App))));
        assert.match(html, /<h[12][ >]/, route);
        assert.doesNotMatch(html, /NaN|\[object Object\]/, route);
        if (route === "/perfil") assert.equal(html.includes("Editar perfil"), !!role);
      }
      for (const route of ["/administrar", "/vendedor"]) {
        const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [route] }, createElement(AppProvider, null, createElement(App))));
        const permitted = route === "/administrar" ? role === "Administrador" : role === "Vendedor";
        assert.equal(html.includes('class="management container"'), permitted, `${role}: ${route}`);
      }
    } finally {
      if (previous) Object.defineProperty(globalThis, "localStorage", previous);
      else delete globalThis.localStorage;
    }
  });
}

function withAppStorage(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = new Map();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } });
  let app;
  function Probe() { app = useApp(); return null; }
  const refresh = () => { renderToStaticMarkup(createElement(AppProvider, null, createElement(Probe))); return app; };
  try { run(storage, refresh); }
  finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
}
const stockProduct = { id: "stock-test", name: "Producto prueba", price: 1000, stock: 2, category: "VACUNAS", image: "", principio: "", especie: "", distributor: "VetSur" };
const cartFor = (quantity = 2) => [{ code: stockProduct.id, name: stockProduct.name, price: 1000, image: "", quantity }];

test("confirmar descuenta stock, persiste el agotamiento y no duplica la compra", () => withAppStorage((storage, refresh) => {
  storage.set("admin-products", JSON.stringify([stockProduct]));
  storage.set("carrito", JSON.stringify(cartFor()));
  const app = refresh();
  assert.equal(app.products[0].stock, 2);
  app.checkout(cartFor());
  assert.equal(JSON.parse(storage.get("admin-products"))[0].stock, 0);
  assert.deepEqual(JSON.parse(storage.get("carrito")), []);
  assert.throws(() => app.checkout(cartFor()), /vacío|confirmada/);
  assert.equal(refresh().addToCart(stockProduct.id), false);
}));

test("compra con stock insuficiente no modifica ningún producto ni el carrito", () => withAppStorage((storage, refresh) => {
  const inventory = [stockProduct, { ...stockProduct, id: "other", stock: 0 }];
  const cart = [...cartFor(1), { ...cartFor(1)[0], code: "other" }];
  storage.set("admin-products", JSON.stringify(inventory));
  storage.set("carrito", JSON.stringify(cart));
  assert.throws(() => refresh().checkout(cart), /insuficiente/);
  assert.deepEqual(JSON.parse(storage.get("admin-products")), inventory);
  assert.deepEqual(JSON.parse(storage.get("carrito")), cart);
}));

test("compra rechaza cambios de carrito, precios y cantidades inválidas", () => withAppStorage((storage, refresh) => {
  storage.set("admin-products", JSON.stringify([stockProduct]));
  storage.set("carrito", JSON.stringify(cartFor(1)));
  assert.throws(() => refresh().checkout(cartFor(2)), /cambió/);
  const expensive = [{ ...stockProduct, price: 2000 }];
  storage.set("admin-products", JSON.stringify(expensive));
  assert.throws(() => refresh().checkout(cartFor(1)), /precio cambió/);
  storage.set("carrito", JSON.stringify(cartFor(0.5)));
  assert.throws(() => refresh().checkout(cartFor(0.5)), /Cantidad inválida/);
}));

test("crear exige stock positivo y editar permite agotado", () => {
  assert.throws(() => validateProduct({ ...stockProduct, stock: 0 }, ["VACUNAS"], true), /al menos 1/);
  assert.doesNotThrow(() => validateProduct({ ...stockProduct, stock: 0 }, ["VACUNAS"], false));
  assert.doesNotThrow(() => validateProduct(stockProduct, ["VACUNAS"], true));
});

test("tarjeta y detalle agotados bloquean agregar y muestran el aviso", () => withAppStorage((_storage, refresh) => {
  const app = refresh();
  const { AppContext } = require("../src/context/AppContext.ts");
  const { ProductCard } = require("../src/components/ProductCard.tsx");
  const { ProductDetail } = require("../src/components/ProductDetail.tsx");
  for (const Component of [ProductCard, ProductDetail]) {
    const html = renderToStaticMarkup(createElement(AppContext.Provider, { value: app }, createElement(Component, { product: { ...stockProduct, stock: 0 }, hidden: false, onViewDetail() {}, onClose() {} })));
    assert.match(html, /disabled=""[^>]*>Agregar al carrito/);
    assert.match(html, /Producto sin stock/);
  }
}));

const { DEFAULT_ADMIN, ADMIN_SEED_KEY, seedAdmin, routeForRole } = require("../src/data/defaultAdmin.ts");
test("administrador inicial se crea una vez sin duplicar ni sobrescribir cambios posteriores", () => {
  const seeded = seedAdmin([user, { ...DEFAULT_ADMIN, role: "Cliente" }], false);
  assert.equal(seeded.filter(p => p.email === DEFAULT_ADMIN.email).length, 1);
  assert.equal(seeded.find(p => p.email === DEFAULT_ADMIN.email).role, "Administrador");
  const edited = seeded.map(p => p.email === DEFAULT_ADMIN.email ? { ...p, direccion: "Nueva 123" } : p);
  assert.deepEqual(seedAdmin(edited, true), edited);
});

test("login usa el rol de la cuenta e ignora el antiguo rol elegido", () => withAppStorage((storage, refresh) => {
  storage.set("clinica-nutridifs-profiles", JSON.stringify([user]));
  storage.set("clinica-nutridifs-session", JSON.stringify({ ...user, role: "Administrador" }));
  let app = refresh();
  assert.equal(app.session.role, "Cliente");
  assert.equal(app.authenticate(user.email, user.password, "Administrador"), "Cliente");
  assert.equal(routeForRole("Cliente"), "/");
  assert.equal(routeForRole("Vendedor"), "/vendedor");
  assert.equal(routeForRole("Administrador"), "/administrar");
  assert.throws(() => app.updateStock(stockProduct.id, 4), /permiso/);
  assert.throws(() => app.saveProduct(stockProduct), /permiso/);
  app = refresh();
  assert.equal(app.session.role, "Cliente");
  assert.equal("password" in app.session, false);
}));

test("credenciales del administrador funcionan y credenciales incorrectas se rechazan", () => withAppStorage((_storage, refresh) => {
  const app = refresh();
  assert.equal(app.authenticate(DEFAULT_ADMIN.email.toUpperCase(), DEFAULT_ADMIN.password), "Administrador");
  assert.throws(() => app.authenticate("inexistente@duoc.cl", "Prueba123"), /No existe/);
  assert.throws(() => app.authenticate(DEFAULT_ADMIN.email, "Incorrecta1"), /no coincide/);
}));

test("login bloquea tras tres fallos y no permite entrar a una cuenta bloqueada", () => withAppStorage((storage, refresh) => {
  storage.set("clinica-nutridifs-profiles", JSON.stringify([user]));
  storage.set(ADMIN_SEED_KEY, "true");
  for (let i = 0; i < 3; i++) assert.throws(() => refresh().authenticate(user.email, "Incorrecta1"));
  assert.equal(refresh().profiles[0].locked, true);
  assert.throws(() => refresh().authenticate(user.email, user.password), /bloqueada/);
}));

test("ambos roles gestionan stock y rechazan altas sin existencias", () => withAppStorage((storage, refresh) => {
  for (const role of ["Vendedor", "Administrador"]) {
    storage.set("clinica-nutridifs-profiles", JSON.stringify([{ ...user, role }]));
    storage.set("clinica-nutridifs-session", JSON.stringify({ email: user.email }));
    storage.set("admin-products", JSON.stringify([stockProduct]));
    let app = refresh();
    assert.throws(() => app.saveProduct({ ...stockProduct, id: "new", stock: 0 }), /al menos 1/);
    app.updateStock(stockProduct.id, 0);
    app = refresh();
    assert.equal(app.products[0].stock, 0);
    app.updateStock(stockProduct.id, 5);
    assert.equal(refresh().products[0].stock, 5);
    assert.throws(() => refresh().updateStock(stockProduct.id, -1));
  }
}));

test("el administrador inicial puede editar sus datos sin inventar apellido", () => withAppStorage((storage, refresh) => {
  storage.set("clinica-nutridifs-profiles", JSON.stringify([DEFAULT_ADMIN]));
  storage.set(ADMIN_SEED_KEY, "true");
  storage.set("clinica-nutridifs-session", JSON.stringify({ email: DEFAULT_ADMIN.email }));
  refresh().updateProfile({ ...DEFAULT_ADMIN, direccion: "Nueva 123" });
  const app = refresh();
  assert.equal(app.profiles[0].direccion, "Nueva 123");
  assert.equal(app.profiles[0].apellido, "");
  assert.equal(app.session.role, "Administrador");
  assert.throws(() => app.register({ ...user, apellido: "" }), /apellido/);
}));
