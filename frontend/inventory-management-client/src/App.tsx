import { useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { AlertTriangle, Boxes, Gauge, Layers, LogOut, PackagePlus, Plus, Search, Truck, Warehouse } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Alert, Button, Card, Input, LoadingSpinner, Modal, Select, Table } from './components/ui';
import { dashboardService } from './api/dashboardService';
import { productService } from './api/productService';
import { categoryService } from './api/categoryService';
import { supplierService } from './api/supplierService';
import { inventoryMovementService } from './api/inventoryMovementService';
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
    <main className="grid min-h-screen place-items-center bg-[#dfd79d] px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-[#d89a5a] bg-[#fffaf0] p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-[#e84416] text-white"><Warehouse /></div>
          <div>
            <h1 className="text-xl font-bold text-[#684134]">Inventory Management</h1>
            <p className="text-sm text-[#8a5a45]">Operational stock control</p>
          </div>
        </div>
        <label className="mb-4 block text-sm font-medium text-[#684134]">Email<Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
        <label className="mb-5 block text-sm font-medium text-[#684134]">Password<Input className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
        {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
        <Button className="w-full" disabled={loading}>{loading ? <LoadingSpinner /> : 'Sign in'}</Button>
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
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const result = await productService.list(search, categoryId);
    setProducts(result.items);
  }, [search, categoryId]);

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
      <div className="grid gap-3 md:grid-cols-[1fr_260px]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-[#8a5a45]" size={18} />
          <Input className="pl-10" placeholder="Search by name, SKU or category" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  <Button variant="danger" onClick={() => productService.deactivate(p.id).then(load)}>Deactivate</Button>
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
    currentStock: product?.currentStock ?? 0,
    minimumStock: product?.minimumStock ?? 0,
    unitPrice: product?.unitPrice ?? 0,
    isActive: product?.isActive ?? true,
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      categoryId: current.categoryId || categories[0]?.id || '',
      supplierId: current.supplierId || suppliers[0]?.id || '',
    }));
  }, [categories, suppliers]);

  const set = (key: string, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.categoryId || !form.supplierId) return;
    if (product) await productService.update(product.id, form);
    else await productService.create(form);
    onSaved();
  }

  return (
    <Modal title={product ? 'Edit product' : 'New product'} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        <Input placeholder="SKU" value={form.sku} onChange={(e) => set('sku', e.target.value)} required disabled={!!product} />
        <Select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} required>
          <option value="" disabled>Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)} required>
          <option value="" disabled>Select supplier</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input type="number" min="0" placeholder="Current stock" value={form.currentStock} onChange={(e) => set('currentStock', Number(e.target.value))} disabled={!!product} />
        <Input type="number" min="0" placeholder="Minimum stock" value={form.minimumStock} onChange={(e) => set('minimumStock', Number(e.target.value))} />
        <Input type="number" min="0" step="0.01" placeholder="Unit price" value={form.unitPrice} onChange={(e) => set('unitPrice', Number(e.target.value))} />
        <Input placeholder="Description" value={form.description} onChange={(e) => set('description', e.target.value)} />
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
    >
      {(creating || editing) && <CategoryForm category={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); void load(); }} />}
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
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
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
    >
      {(creating || editing) && <SupplierForm supplier={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); void load(); }} />}
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
        <Input placeholder="Name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        <Input placeholder="Contact" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
        <Input placeholder="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <Input placeholder="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        <Input className="md:col-span-2" placeholder="Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
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
  const [form, setForm] = useState({ productId: '', type: 'Entry' as MovementType, quantity: 1, reason: '' });

  const load = useCallback(async () => {
    const [productResult, latestMovements] = await Promise.all([productService.list(), inventoryMovementService.latest(50)]);
    setProducts(productResult.items);
    setMovements(latestMovements);
    setForm((current) => ({ ...current, productId: current.productId || productResult.items[0]?.id || '' }));
  }, []);

  useDataRefresh(load);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await inventoryMovementService.register(form);
    setForm((current) => ({ ...current, quantity: 1, reason: '' }));
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
          <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <Input placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required />
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

function SimpleCrud<T extends { id: string }>({ title, items, columns, children, onCreate, onEdit, onDeactivate }: { title: string; items: T[]; columns: Extract<keyof T, string>[]; children: React.ReactNode; onCreate: () => void; onEdit: (item: T) => void; onDeactivate: (id: string) => void }) {
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
                  <Button variant="danger" onClick={() => onDeactivate(String(item.id))}>Deactivate</Button>
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
