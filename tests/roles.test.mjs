import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
// Compile application TypeScript in memory for Node's test runner.
Module._extensions[".ts"] = (module, filename) => {
  // import.meta.env es de Vite y no existe en CommonJS: aquí se reemplaza por un objeto vacío
  // (así axiosConfig usa su URL por defecto y Node no trata el archivo como módulo ES).
  const source = fs.readFileSync(filename, "utf8").replace(/import\.meta\.env/g, "({})");
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
};
const { requireRole, validateUser, validateStock, validateProduct, normalizeCategory } = require("../src/utils/administracion.ts");
const user = { name: "Prueba", apellido: "Roles", email: "roles@duoc.cl", birthDate: "2000-01-01", direccion: "Prueba 123", genero: "otro", phone: "", region: "Metropolitana de Santiago", comuna: "Santiago", password: "Prueba123", role: "Cliente", failedAttempts: 0, locked: false };
// Deja la sesión como queda después de un login en la API: los datos de sesión y el token.
// Sin token, AppProvider no restaura la sesión.
function guardarSesion(storage, session) {
  storage.set("clinica-nutridifs-session", JSON.stringify(session));
  storage.set("clinica-nutridifs-token", "token-de-prueba");
}
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
test("búsqueda por nombre admite coincidencias parciales, tildes, mayúsculas y espacios", () => {
  assert.equal(matchesProductName("Antibiótico Veterinario", "  ANTIBIOTICO  "), true);
  assert.equal(matchesProductName("Antibiótico Veterinario", "veter"), true);
  assert.equal(matchesProductName("Vacuna", ""), true);
  assert.equal(matchesProductName("Vacuna", "antibiotico"), false);
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
      if (role) guardarSesion(storage, { ...user, role });
      // /perfil pide sesión: sin sesión redirige al login (se prueba abajo)
      for (const route of publicRoutes.filter(r => role || r !== "/perfil")) {
        const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [route] }, createElement(AppProvider, null, createElement(App))));
        assert.match(html, /<h[12][ >]/, route);
        assert.doesNotMatch(html, /NaN|\[object Object\]/, route);
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

// Matriz de rutas protegidas: quién entra, a quién se manda al login y a quién se le niega
test("rutas protegidas por rol", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = new Map();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } });
  // ruta -> roles que pueden entrar
  const protegidas = {
    "/administrar": ["Administrador"],
    "/vendedor": ["Vendedor"],
    "/pacientes": ["Administrador"],
    "/perfil": ["Cliente", "Vendedor", "Administrador"],
    "/mis-compras": ["Cliente", "Vendedor", "Administrador"],
    "/ordenes": ["Vendedor", "Administrador"],
  };
  const render = route => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [route] }, createElement(AppProvider, null, createElement(App))));
  try {
    for (const role of [null, "Cliente", "Vendedor", "Administrador"]) {
      storage.clear();
      storage.set("clinica-nutridifs-profiles", JSON.stringify([{ ...user, role: role || "Cliente" }]));
      if (role) guardarSesion(storage, { ...user, role });
      for (const [route, permitidos] of Object.entries(protegidas)) {
        const html = render(route);
        const denegado = html.includes("No tienes permiso");
        if (!role) {
          // Sin sesión <Navigate> manda al login: no se muestra la página ni el aviso
          assert.equal(denegado, false, `invitado: ${route}`);
          assert.doesNotMatch(html, /<main/, `invitado: ${route}`);
        } else {
          assert.equal(denegado, !permitidos.includes(role), `${role}: ${route}`);
        }
      }
      // El menú solo muestra los enlaces del rol
      const menu = render("/");
      assert.equal(menu.includes('href="/administrar"'), role === "Administrador", `${role}: enlace administrar`);
      assert.equal(menu.includes('href="/pacientes"'), role === "Administrador", `${role}: enlace pacientes`);
      assert.equal(menu.includes('href="/vendedor"'), role === "Vendedor", `${role}: enlace vendedor`);
      assert.equal(menu.includes('href="/ordenes"'), role === "Vendedor" || role === "Administrador", `${role}: enlace ventas`);
      assert.equal(menu.includes('href="/mis-compras"'), !!role, `${role}: enlace mis compras`);
      assert.equal(menu.includes("Iniciar sesión"), !role, `${role}: enlace login`);
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});

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

// El login, los intentos fallidos y el bloqueo ahora los valida el backend
// La compra, el stock, los productos y los usuarios también viven en la API: se prueban en el
// backend (ReceiptServiceTest, ProductServiceTest, CategoryServiceTest, AuthServiceTest).
// (ver AuthServiceTest en miapi-backend-nutrivfis). Aquí se prueba la sesión del lado del frontend.
const { rolDesdeApi, sesionDesdeApi } = require("../src/utils/roles.ts");

test("la sesión guardada solo se restaura si hay token", () => withAppStorage((storage, refresh) => {
  storage.set("clinica-nutridifs-session", JSON.stringify({ ...user, role: "Administrador" }));
  assert.equal(refresh().session, null);
  storage.set("clinica-nutridifs-token", "token-de-prueba");
  assert.equal(refresh().session.role, "Administrador");
}));

test("los roles de la API se traducen y la sesión no guarda la contraseña", () => {
  assert.equal(rolDesdeApi("ADMIN"), "Administrador");
  assert.equal(rolDesdeApi("SELLER"), "Vendedor");
  assert.equal(rolDesdeApi("CLIENT"), "Cliente");
  assert.equal(routeForRole(rolDesdeApi("CLIENT")), "/");
  assert.equal(routeForRole(rolDesdeApi("SELLER")), "/vendedor");
  assert.equal(routeForRole(rolDesdeApi("ADMIN")), "/administrar");
  const session = sesionDesdeApi({ token: "t", type: "Bearer", expiresIn: 3600, refreshToken: "r", refreshExpiresIn: 1,
    name: "Ana", lastName: "Pérez", email: "ana@gmail.com", birthDate: "2000-01-01", phone: null, role: "SELLER" });
  assert.deepEqual(session, { name: "Ana", apellido: "Pérez", email: "ana@gmail.com", birthDate: "2000-01-01", phone: "", role: "Vendedor" });
  assert.equal("password" in session || "token" in session, false);
});
