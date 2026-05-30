import { useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { AlertTriangle, Boxes, Gauge, KeyRound, Layers, LogOut, PackagePlus, Plus, Search, Settings, ShieldCheck, Trash2, Truck, Warehouse } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Alert, Button, Card, Input, LoadingSpinner, Modal, Select, Table } from './components/ui';
import { dashboardService } from './api/dashboardService';
import { productService } from './api/productService';
import { categoryService } from './api/categoryService';
import { supplierService } from './api/supplierService';
import { inventoryMovementService } from './api/inventoryMovementService';
import { adminService } from './api/adminService';
import { useDataRefresh } from './state/dataEvents';
import type { Category, Dashboard, InventoryMovement, MovementType, Product, Supplier } from './types';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><LoadingSpinner /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@inventory.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#dfd79d] px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-[460px] rounded-lg border border-[#d89a5a] bg-[#fffaf0] p-7 shadow-sm sm:p-10">
        <div className="mb-9 flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-[#e84416] text-white shadow-sm"><Warehouse /></div>
          <div>
            <h1 className="text-2xl font-bold text-[#684134]">Inventory Management</h1>
            <p className="mt-1 text-sm text-[#8a5a45]">Sign in to manage stock operations</p>
          </div>
        </div>
        <div className="space-y-5">
          <label className="block text-sm font-semibold text-[#684134]">
            Email
            <Input className="mt-2" placeholder="admin@inventory.local" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label className="block text-sm font-semibold text-[#684134]">
            Password
            <Input className="mt-2" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
        </div>
        {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
        <Button className="mt-7 w-full py-2.5" disabled={loading}>{loading ? <LoadingSpinner /> : 'Sign in'}</Button>
      </form>
    </main>
  );
}

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = [
    { to: '/', label: 'Dashboard', icon: Gauge },
    { to: '/products', label: 'Products', icon: Boxes },
    { to: '/categories', label: 'Categories', icon: Layers },
    { to: '/suppliers', label: 'Suppliers', icon: Truck },
    { to: '/movements', label: 'Movements', icon: PackagePlus },
    ...(user?.role === 'Admin' ? [{ to: '/admin', label: 'Admin', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f6f0d1] lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-[#805040] bg-[#684134] text-white">
        <div className="flex h-16 items-center gap-3 px-5">
          <Warehouse className="text-[#dfd79d]" />
          <span className="font-bold">IMS</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-[#e84416] text-white' : 'text-[#f6f0d1] hover:bg-[#7a4d3f]'}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div>
        <header className="flex h-16 items-center justify-between border-b border-[#d9cf93] bg-[#fffaf0] px-5">
          <div>
            <p className="text-sm font-semibold text-[#684134]">{user?.fullName}</p>
            <p className="text-xs text-[#8a5a45]">{user?.role}</p>
          </div>
          <Button variant="secondary" onClick={() => { logout(); navigate('/login'); }}><LogOut size={16} /> Logout</Button>
        </header>
        <main className="p-5">
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="movements" element={<MovementsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const load = useCallback(async () => {
    setData(await dashboardService.get());
  }, []);
  useDataRefresh(load);

  if (!data) return <LoadingSpinner />;

  const cards = [
    ['Active products', data.totalActiveProducts],
    ['Low stock', data.lowStockProducts],
    ['Active suppliers', data.totalActiveSuppliers],
    ['Inventory value', currency.format(data.estimatedInventoryValue)],
  ];

  return (
    <section className="space-y-5">
      <PageTitle title="Dashboard" action={null} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-[#8a5a45]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[#684134]">{value}</p>
          </Card>
        ))}
      </div>
      <MovementsTable movements={data.latestMovements} />
    </section>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<Product | null>(null);

  const load = useCallback(async () => {
    const isActive = statusFilter === 'all' ? null : statusFilter === 'active';
    const result = await productService.list(search, categoryId, isActive);
    setProducts(result.items);
  }, [search, categoryId, statusFilter]);

  const loadLookups = useCallback(async () => {
    const [nextCategories, nextSuppliers] = await Promise.all([categoryService.list(), supplierService.list()]);
    setCategories(nextCategories);
    setSuppliers(nextSuppliers);
  }, []);

  useDataRefresh(load);
  useDataRefresh(loadLookups);

  return (
    <section className="space-y-4">
      <PageTitle title="Products" action={<Button onClick={() => setCreating(true)}><Plus size={16} /> New product</Button>} />
      <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-[#8a5a45]" size={18} />
          <Input className="pl-10" placeholder="Search by name, SKU or category" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')}>
          <option value="active">Active products</option>
          <option value="inactive">Inactive products</option>
          <option value="all">All statuses</option>
        </Select>
      </div>
      <Table>
        <thead>
          <tr className="text-left text-xs uppercase text-[#8a5a45]">
            <th className="px-4 py-3">Product</th>
            <th>Stock</th>
            <th>Price</th>
            <th>Status</th>
            <th className="px-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eadfa9]">
          {products.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-[#684134]">{p.name}</p>
                <p className="text-xs text-[#8a5a45]">{p.sku} - {p.categoryName} - {p.supplierName}</p>
                {p.isLowStock && <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#e84416]"><AlertTriangle size={14} /> Low stock</p>}
              </td>
              <td>{p.currentStock} / min {p.minimumStock}</td>
              <td>{currency.format(p.unitPrice)}</td>
              <td>{p.isActive ? 'Active' : 'Inactive'}</td>
              <td className="px-4">
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(p)}>Edit</Button>
                  {p.isActive ? (
                    <Button variant="danger" onClick={() => productService.deactivate(p.id).then(load)}>Deactivate</Button>
                  ) : (
                    <Button variant="secondary" onClick={() => setActivating(p)}><ShieldCheck size={16} /> Activate</Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {(creating || editing) && (
        <ProductForm
          product={editing}
          categories={categories}
          suppliers={suppliers}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); void load(); }}
        />
      )}
      {activating && (
        <ActivationModal
          title="Activate product"
          label={activating.name}
          onClose={() => setActivating(null)}
          onConfirm={async (password) => {
            await productService.activate(activating.id, password);
            setActivating(null);
            await load();
          }}
        />
      )}
    </section>
  );
}

function ProductForm({ product, categories, suppliers, onClose, onSaved }: { product: Product | null; categories: Category[]; suppliers: Supplier[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    sku: product?.sku ?? '',
    categoryId: product?.categoryId ?? categories[0]?.id ?? '',
    supplierId: product?.supplierId ?? suppliers[0]?.id ?? '',
    currentStock: product ? String(product.currentStock) : '',
    minimumStock: product ? String(product.minimumStock) : '',
    unitPrice: product ? String(product.unitPrice) : '',
    isActive: product?.isActive ?? true,
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      categoryId: current.categoryId || categories[0]?.id || '',
      supplierId: current.supplierId || suppliers[0]?.id || '',
    }));
  }, [categories, suppliers]);

  const set = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.categoryId || !form.supplierId) return;
    const payload = {
      ...form,
      currentStock: Number(form.currentStock || 0),
      minimumStock: Number(form.minimumStock || 0),
      unitPrice: Number(form.unitPrice || 0),
    };
    if (product) await productService.update(product.id, payload);
    else await productService.create(payload);
    onSaved();
  }

  return (
    <Modal title={product ? 'Edit product' : 'New product'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Product name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        <Input placeholder="Unique SKU, e.g. ELEC-001" value={form.sku} onChange={(e) => set('sku', e.target.value)} required disabled={!!product} />
        <Select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} required>
          <option value="" disabled>Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)} required>
          <option value="" disabled>Select supplier</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input type="number" min="0" placeholder="Initial stock quantity, e.g. 25" aria-label="Initial stock quantity" value={form.currentStock} onChange={(e) => set('currentStock', e.target.value)} disabled={!!product} />
        <Input type="number" min="0" placeholder="Minimum stock alert level, e.g. 5" aria-label="Minimum stock alert level" value={form.minimumStock} onChange={(e) => set('minimumStock', e.target.value)} />
        <Input type="number" min="0" step="0.01" placeholder="Unit price, e.g. 19.99" aria-label="Unit price" value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} />
        <Input placeholder="Short product description" value={form.description} onChange={(e) => set('description', e.target.value)} />
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.categoryId || !form.supplierId}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<Category | null>(null);
  const load = useCallback(async () => setItems(await categoryService.list()), []);
  useDataRefresh(load);

  return (
    <SimpleCrud<Category>
      title="Categories"
      items={items}
      columns={['name', 'description', 'isActive']}
      onCreate={() => setCreating(true)}
      onEdit={setEditing}
      onDeactivate={(id) => categoryService.deactivate(id).then(load)}
      onActivate={(item) => setActivating(item)}
    >
      {(creating || editing) && <CategoryForm category={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); void load(); }} />}
      {activating && (
        <ActivationModal
          title="Activate category"
          label={activating.name}
          onClose={() => setActivating(null)}
          onConfirm={async (password) => {
            await categoryService.activate(activating.id, password);
            setActivating(null);
            await load();
          }}
        />
      )}
    </SimpleCrud>
  );
}

function CategoryForm({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (category) await categoryService.update(category.id, { name, description });
    else await categoryService.create({ name, description });
    onSaved();
  }

  return (
    <Modal title={category ? 'Edit category' : 'New category'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" required />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Category description" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<Supplier | null>(null);
  const load = useCallback(async () => setItems(await supplierService.list()), []);
  useDataRefresh(load);

  return (
    <SimpleCrud<Supplier>
      title="Suppliers"
      items={items}
      columns={['name', 'contactName', 'email', 'phone', 'isActive']}
      onCreate={() => setCreating(true)}
      onEdit={setEditing}
      onDeactivate={(id) => supplierService.deactivate(id).then(load)}
      onActivate={(item) => setActivating(item)}
    >
      {(creating || editing) && <SupplierForm supplier={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); void load(); }} />}
      {activating && (
        <ActivationModal
          title="Activate supplier"
          label={activating.name}
          onClose={() => setActivating(null)}
          onConfirm={async (password) => {
            await supplierService.activate(activating.id, password);
            setActivating(null);
            await load();
          }}
        />
      )}
    </SimpleCrud>
  );
}

function SupplierForm({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: supplier?.name ?? '', contactName: supplier?.contactName ?? '', email: supplier?.email ?? '', phone: supplier?.phone ?? '', address: supplier?.address ?? '' });
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (supplier) await supplierService.update(supplier.id, form);
    else await supplierService.create(form);
    onSaved();
  }

  return (
    <Modal title={supplier ? 'Edit supplier' : 'New supplier'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Supplier company name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        <Input placeholder="Contact person name" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
        <Input placeholder="Supplier email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <Input placeholder="Supplier phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        <Input className="md:col-span-2" placeholder="Supplier address" value={form.address} onChange={(e) => set('address', e.target.value)} />
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function MovementsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [form, setForm] = useState({ productId: '', type: 'Entry' as MovementType, quantity: '', reason: '' });

  const load = useCallback(async () => {
    const [productResult, latestMovements] = await Promise.all([productService.list(), inventoryMovementService.latest(50)]);
    setProducts(productResult.items);
    setMovements(latestMovements);
    setForm((current) => ({ ...current, productId: current.productId || productResult.items[0]?.id || '' }));
  }, []);

  useDataRefresh(load);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await inventoryMovementService.register({ ...form, quantity: Number(form.quantity || 0) });
    setForm((current) => ({ ...current, quantity: '', reason: '' }));
    await load();
  }

  return (
    <section className="space-y-5">
      <PageTitle title="Inventory movements" action={null} />
      <Card>
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1.5fr_160px_120px_1fr_auto]">
          <Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
            <option value="" disabled>Select product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </Select>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as MovementType })}>
            <option>Entry</option>
            <option>Exit</option>
            <option>Adjustment</option>
          </Select>
          <Input type="number" min="0" placeholder="Movement quantity, e.g. 10" aria-label="Movement quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <Input placeholder="Reason for movement" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
          <Button disabled={!form.productId}>Register</Button>
        </form>
      </Card>
      <MovementsTable movements={movements} />
    </section>
  );
}

function MovementsTable({ movements }: { movements: InventoryMovement[] }) {
  return (
    <Table>
      <thead>
        <tr className="text-left text-xs uppercase text-[#8a5a45]">
          <th className="px-4 py-3">Product</th>
          <th>Type</th>
          <th>Qty</th>
          <th>Stock</th>
          <th>Reason</th>
          <th className="px-4">Date</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#eadfa9]">
        {movements.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-3">
              <p className="font-medium text-[#684134]">{m.productName}</p>
              <p className="text-xs text-[#8a5a45]">{m.sku}</p>
            </td>
            <td>{m.type}</td>
            <td>{m.quantity}</td>
            <td>{m.previousStock} {'->'} {m.newStock}</td>
            <td>{m.reason}</td>
            <td className="px-4">{new Date(m.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

type DeleteTarget =
  | { kind: 'product'; id: string; label: string }
  | { kind: 'category'; id: string; label: string }
  | { kind: 'supplier'; id: string; label: string }
  | { kind: 'movement'; id: string; label: string };

function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const load = useCallback(async () => {
    const [productResult, nextCategories, nextSuppliers, nextMovements] = await Promise.all([
      productService.list('', '', null),
      categoryService.list(),
      supplierService.list(),
      inventoryMovementService.latest(100),
    ]);
    setProducts(productResult.items);
    setCategories(nextCategories);
    setSuppliers(nextSuppliers);
    setMovements(nextMovements);
  }, []);

  useDataRefresh(load);

  async function confirmDelete(password: string) {
    if (!deleteTarget) return;

    const actions = {
      product: () => adminService.deleteProduct(deleteTarget.id, password),
      category: () => adminService.deleteCategory(deleteTarget.id, password),
      supplier: () => adminService.deleteSupplier(deleteTarget.id, password),
      movement: () => adminService.deleteInventoryMovement(deleteTarget.id, password),
    };

    await actions[deleteTarget.kind]();
    setDeleteTarget(null);
    await load();
  }

  return (
    <section className="space-y-5">
      <PageTitle title="Admin" action={null} />
      <Alert tone="warning">Permanent deletes require the protected action password. Items with dependent records may need their related data removed first.</Alert>
      <AdminProducts products={products} onDelete={(product) => setDeleteTarget({ kind: 'product', id: product.id, label: `${product.name} (${product.sku})` })} />
      <AdminCategories categories={categories} onDelete={(category) => setDeleteTarget({ kind: 'category', id: category.id, label: category.name })} />
      <AdminSuppliers suppliers={suppliers} onDelete={(supplier) => setDeleteTarget({ kind: 'supplier', id: supplier.id, label: supplier.name })} />
      <AdminMovements movements={movements} onDelete={(movement) => setDeleteTarget({ kind: 'movement', id: movement.id, label: `${movement.productName} ${movement.type} ${movement.quantity}` })} />
      {deleteTarget && (
        <DeleteModal
          label={deleteTarget.label}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  );
}

function AdminProducts({ products, onDelete }: { products: Product[]; onDelete: (product: Product) => void }) {
  return (
    <AdminSection title="Products">
      <Table>
        <thead>
          <tr className="text-left text-xs uppercase text-[#8a5a45]">
            <th className="px-4 py-3">Product</th>
            <th>Stock</th>
            <th>Status</th>
            <th className="px-4">Delete</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eadfa9]">
          {products.map((product) => (
            <tr key={product.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-[#684134]">{product.name}</p>
                <p className="text-xs text-[#8a5a45]">{product.sku} - {product.categoryName} - {product.supplierName}</p>
              </td>
              <td>{product.currentStock}</td>
              <td>{product.isActive ? 'Active' : 'Inactive'}</td>
              <td className="px-4"><Button variant="danger" onClick={() => onDelete(product)}><Trash2 size={16} /> Delete</Button></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </AdminSection>
  );
}

function AdminCategories({ categories, onDelete }: { categories: Category[]; onDelete: (category: Category) => void }) {
  return (
    <AdminSection title="Categories">
      <Table>
        <thead>
          <tr className="text-left text-xs uppercase text-[#8a5a45]">
            <th className="px-4 py-3">Name</th>
            <th>Status</th>
            <th className="px-4">Delete</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eadfa9]">
          {categories.map((category) => (
            <tr key={category.id}>
              <td className="px-4 py-3">{category.name}</td>
              <td>{category.isActive ? 'Active' : 'Inactive'}</td>
              <td className="px-4"><Button variant="danger" onClick={() => onDelete(category)}><Trash2 size={16} /> Delete</Button></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </AdminSection>
  );
}

function AdminSuppliers({ suppliers, onDelete }: { suppliers: Supplier[]; onDelete: (supplier: Supplier) => void }) {
  return (
    <AdminSection title="Suppliers">
      <Table>
        <thead>
          <tr className="text-left text-xs uppercase text-[#8a5a45]">
            <th className="px-4 py-3">Name</th>
            <th>Contact</th>
            <th>Status</th>
            <th className="px-4">Delete</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eadfa9]">
          {suppliers.map((supplier) => (
            <tr key={supplier.id}>
              <td className="px-4 py-3">{supplier.name}</td>
              <td>{supplier.contactName || supplier.email || ''}</td>
              <td>{supplier.isActive ? 'Active' : 'Inactive'}</td>
              <td className="px-4"><Button variant="danger" onClick={() => onDelete(supplier)}><Trash2 size={16} /> Delete</Button></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </AdminSection>
  );
}

function AdminMovements({ movements, onDelete }: { movements: InventoryMovement[]; onDelete: (movement: InventoryMovement) => void }) {
  return (
    <AdminSection title="Inventory movements">
      <Table>
        <thead>
          <tr className="text-left text-xs uppercase text-[#8a5a45]">
            <th className="px-4 py-3">Product</th>
            <th>Type</th>
            <th>Qty</th>
            <th>Date</th>
            <th className="px-4">Delete</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eadfa9]">
          {movements.map((movement) => (
            <tr key={movement.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-[#684134]">{movement.productName}</p>
                <p className="text-xs text-[#8a5a45]">{movement.sku}</p>
              </td>
              <td>{movement.type}</td>
              <td>{movement.quantity}</td>
              <td>{new Date(movement.createdAt).toLocaleDateString()}</td>
              <td className="px-4"><Button variant="danger" onClick={() => onDelete(movement)}><Trash2 size={16} /> Delete</Button></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </AdminSection>
  );
}

function AdminSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-[#684134]">{title}</h2>
      {children}
    </section>
  );
}

function ActivationModal({ title, label, onClose, onConfirm }: { title: string; label: string; onClose: () => void; onConfirm: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onConfirm(password);
    } catch {
      setError('Invalid reactivation password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-md border border-[#d9cf93] bg-[#f7f2d3] px-3 py-2 text-sm text-[#684134]">
          <div className="flex items-center gap-2 font-semibold"><KeyRound size={16} /> Security check</div>
          <p className="mt-1 text-[#8a5a45]">Enter the reactivation password to activate {label} again.</p>
        </div>
        <Input type="password" placeholder="Reactivation password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={loading}>{loading ? <LoadingSpinner /> : 'Activate'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({ label, onClose, onConfirm }: { label: string; onClose: () => void; onConfirm: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onConfirm(password);
    } catch (error) {
      const responseError = error as { response?: { data?: { error?: string } } };
      setError(responseError.response?.data?.error ?? 'Could not delete this item.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Delete item" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Alert tone="error">This permanently deletes {label}. This action cannot be undone.</Alert>
        <Input type="password" placeholder="Protected action password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={loading}>{loading ? <LoadingSpinner /> : 'Delete permanently'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function SimpleCrud<T extends { id: string; isActive?: boolean; name?: string }>({ title, items, columns, children, onCreate, onEdit, onDeactivate, onActivate }: { title: string; items: T[]; columns: Extract<keyof T, string>[]; children: React.ReactNode; onCreate: () => void; onEdit: (item: T) => void; onDeactivate: (id: string) => void; onActivate: (item: T) => void }) {
  return (
    <section className="space-y-4">
      <PageTitle title={title} action={<Button onClick={onCreate}><Plus size={16} /> New</Button>} />
      <Table>
        <thead>
          <tr className="text-left text-xs uppercase text-[#8a5a45]">
            {columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}
            <th className="px-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eadfa9]">
          {items.map((item) => (
            <tr key={String(item.id)}>
              {columns.map((column) => <td key={column} className="px-4 py-3">{String(item[column] ?? '')}</td>)}
              <td className="px-4">
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => onEdit(item)}>Edit</Button>
                  {item.isActive === false ? (
                    <Button variant="secondary" onClick={() => onActivate(item)}><ShieldCheck size={16} /> Activate</Button>
                  ) : (
                    <Button variant="danger" onClick={() => onDeactivate(String(item.id))}>Deactivate</Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {children}
    </section>
  );
}

function PageTitle({ title, action }: { title: string; action: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold text-[#684134]">{title}</h1>{action}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<ProtectedRoute><Layout /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
