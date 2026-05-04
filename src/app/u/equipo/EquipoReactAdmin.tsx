"use client";

import { useEffect, useState, useMemo } from 'react';
import {
  Admin, Resource,
  List, useListContext, useDelete, useRefresh, useRedirect, useResourceContext,
  Filter, TextInput, SelectInput,
  Edit, SimpleForm, PasswordInput, DateInput, required,
  Create, SaveButton, Toolbar,
} from 'react-admin';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@/components/theme/ThemeProvider';
import { dataProvider } from '@/lib/react-admin-data-provider';

// ─── Opciones de formulario ────────────────────────────────────────────
// Solo COLLAB y STAFF — COORDINATOR no puede asignar roles superiores
const roleChoices = [
  { id: 'COLLAB', name: 'Colaborador' },
  { id: 'STAFF', name: 'Staff' },
];

const areaChoices = [
  { id: 'Caja', name: 'Caja' },
  { id: 'Barra', name: 'Barra' },
  { id: 'Mozos', name: 'Mozos' },
  { id: 'Seguridad', name: 'Seguridad' },
  { id: 'Animación', name: 'Animación' },
  { id: 'DJs', name: 'DJs' },
  { id: 'Multimedia', name: 'Multimedia' },
  { id: 'Otros', name: 'Otros' },
];

// ─── Tema ──────────────────────────────────────────────────────────────
const createAppTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: { main: mode === 'dark' ? '#38bdf8' : '#0ea5e9', contrastText: '#ffffff' },
    secondary: { main: mode === 'dark' ? '#0369a1' : '#075985', contrastText: '#ffffff' },
    background: {
      default: mode === 'dark' ? '#0f172a' : '#f8fafc',
      paper: mode === 'dark' ? '#1e293b' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? '#f1f5f9' : '#1e293b',
      secondary: mode === 'dark' ? '#94a3b8' : '#64748b',
    },
  },
  typography: { fontFamily: 'system-ui, Inter, Segoe UI, Roboto, Arial, sans-serif' },
  components: {
    MuiAppBar: { styleOverrides: { root: { display: 'none' } } },
    MuiToolbar: { styleOverrides: { root: { minHeight: '48px' } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 6, textTransform: 'none', fontWeight: 500 } } },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            '& fieldset': { borderColor: mode === 'dark' ? '#334155' : '#e2e8f0' },
            '&:hover fieldset': { borderColor: mode === 'dark' ? '#475569' : '#cbd5e1' },
            '&.Mui-focused fieldset': { borderColor: mode === 'dark' ? '#38bdf8' : '#0ea5e9' },
          },
          '& .MuiInputLabel-root': { color: mode === 'dark' ? '#94a3b8' : '#64748b' },
          '& .MuiOutlinedInput-input': { color: mode === 'dark' ? '#f1f5f9' : '#1e293b' },
        },
      },
    },
  },
});

// ─── Tipos ────────────────────────────────────────────────────────────
type UserRecord = {
  id: string;
  username: string;
  personName?: string;
  role?: string;
  area?: string;
  whatsapp?: string;
  birthday?: string;
  createdAt?: string;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinador',
  STAFF: 'Staff',
  COLLAB: 'Colaborador',
};

// ─── Layout sin sidebar ────────────────────────────────────────────────
const CustomLayout = ({ children }: any) => (
  <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-soft)', padding: '8px' }}>
    {children}
  </div>
);

// ─── Modal Detalles ───────────────────────────────────────────────────
function DetailsModal({ user, onClose }: { user: UserRecord; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {user.personName || user.username}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">@{user.username}</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
          {([
            { label: 'Rol', value: ROLE_LABELS[user.role ?? ''] || user.role || '—' },
            { label: 'Área', value: user.area || '—' },
            { label: 'WhatsApp', value: user.whatsapp || '—' },
            { label: 'Cumpleaños', value: user.birthday || '—' },
            {
              label: 'Registrado',
              value: user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—',
            },
          ] as { label: string; value: string }[]).map(row => (
            <div key={row.label} className="flex justify-between py-2 gap-4">
              <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">{row.label}</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-right">{row.value}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ─── Modal Confirmar Eliminación ──────────────────────────────────────
function DeleteModal({
  user, onConfirm, onClose, isDeleting,
}: {
  user: UserRecord;
  onConfirm: () => void;
  onClose: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={!isDeleting ? onClose : undefined}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">¿Eliminar usuario?</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Se eliminará a <strong className="text-slate-800 dark:text-slate-100">{user.personName || user.username}</strong> del sistema y perderá acceso a la plataforma.
        </p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Eliminando…
              </>
            ) : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contenido lista (cards mobile-first) ─────────────────────────────
function EquipoListContent() {
  const { data, isPending } = useListContext<UserRecord>();
  const redirect = useRedirect();
  const refresh = useRefresh();
  const [deleteOne, { isPending: isDeleting }] = useDelete();
  const [detailsUser, setDetailsUser] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteOne(
      'users',
      { id: deleteTarget.id, previousData: deleteTarget },
      {
        onSuccess: () => {
          setDeleteTarget(null);
          refresh();
        },
      },
    );
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400 text-sm">
        No hay usuarios registrados.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 p-2 sm:p-3">
        {data.map(user => (
          <div
            key={user.id}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
          >
            <div className="px-4 pt-3 pb-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                {user.personName || '—'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">@{user.username}</p>
            </div>
            <div className="flex border-t border-slate-100 dark:border-slate-700 divide-x divide-slate-100 dark:divide-slate-700">
              <button
                onClick={() => setDetailsUser(user)}
                className="flex-1 py-2.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                Detalles
              </button>
              <button
                onClick={() => redirect('edit', 'users', user.id)}
                className="flex-1 py-2.5 text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => setDeleteTarget(user)}
                className="flex-1 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      {detailsUser && (
        <DetailsModal user={detailsUser} onClose={() => setDetailsUser(null)} />
      )}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}

// ─── Filtros ──────────────────────────────────────────────────────────
const EquipoFilter = (props: any) => (
  <Filter {...props}>
    <TextInput label="Usuario" source="username" alwaysOn />
    <TextInput label="Nombre" source="personName" />
    <SelectInput label="Área" source="area" choices={areaChoices} />
  </Filter>
);

const EquipoList = (props: any) => (
  <List
    {...props}
    filters={<EquipoFilter />}
    sort={{ field: 'createdAt', order: 'DESC' }}
    title="Gestión de Equipo"
  >
    <EquipoListContent />
  </List>
);

// ─── Formulario compartido (edición / creación) ───────────────────────
const formSx = {
  maxWidth: 560,
  mx: 'auto',
  px: { xs: 2, sm: 3 },
  '& .MuiTextField-root': { mb: { xs: 2, sm: 1 } },
  '& .MuiFormControl-root': { mb: { xs: 2, sm: 1 } },
};

const BackToolbar = () => {
  const redirect = useRedirect();
  const resource = useResourceContext();
  return (
    <Toolbar sx={{ display: 'flex', flexDirection: { xs: 'column-reverse', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: { xs: 1.5, sm: 2 } }}>
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => redirect('list', resource ?? 'users')}
        sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
      >
        Volver a lista
      </Button>
      <SaveButton />
    </Toolbar>
  );
};

const EquipoEdit = (props: any) => (
  <Edit {...props} title="Editar usuario">
    <SimpleForm toolbar={<BackToolbar />} sx={formSx}>
      <TextInput source="username" label="Usuario" validate={required()} fullWidth />
      <PasswordInput source="password" label="Nueva contraseña (vacío = sin cambio)" fullWidth />
      <TextInput source="personName" label="Nombre completo" validate={required()} fullWidth />
      <SelectInput source="role" label="Rol" choices={roleChoices} validate={required()} fullWidth />
      <SelectInput source="area" label="Área" choices={areaChoices} fullWidth />
      <TextInput source="whatsapp" label="WhatsApp" fullWidth />
      <DateInput source="birthday" label="Cumpleaños" fullWidth />
    </SimpleForm>
  </Edit>
);

const EquipoCreate = (props: any) => (
  <Create {...props} title="Nuevo usuario">
    <SimpleForm toolbar={<BackToolbar />} defaultValues={{ role: 'STAFF' }} sx={formSx}>
      <TextInput source="username" label="Usuario" validate={required()} fullWidth />
      <PasswordInput source="password" label="Contraseña" validate={required()} fullWidth />
      <TextInput source="personName" label="Nombre completo" validate={required()} fullWidth />
      <SelectInput source="role" label="Rol" choices={roleChoices} validate={required()} fullWidth />
      <SelectInput source="area" label="Área" choices={areaChoices} fullWidth />
      <TextInput source="whatsapp" label="WhatsApp" fullWidth />
      <DateInput source="birthday" label="Cumpleaños" fullWidth />
    </SimpleForm>
  </Create>
);

// ─── App principal ────────────────────────────────────────────────────
export default function EquipoReactAdmin() {
  const { resolved } = useTheme();
  const [mounted, setMounted] = useState(false);
  const theme = useMemo(() => createAppTheme(resolved), [resolved]);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Admin
          dataProvider={dataProvider}
          theme={theme}
          disableTelemetry
          layout={CustomLayout}
        >
          <Resource
            name="users"
            list={EquipoList}
            edit={EquipoEdit}
            create={EquipoCreate}
          />
        </Admin>
      </div>
    </MuiThemeProvider>
  );
}
