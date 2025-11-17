"use client";

import {
  List,
  Datagrid,
  TextField,
  DateField,
  EditButton,
  DeleteButton,
  CreateButton,
  Filter,
  TextInput,
  SelectInput,
  TopToolbar,
  useNotify,
  useRefresh,
} from 'react-admin';
import { useState } from 'react';

const UserFilter = (props: any) => (
  <Filter {...props}>
    <TextInput label="Username" source="username" alwaysOn />
    <TextInput label="Name" source="personName" />
    <TextInput label="DNI" source="dni" />
    <SelectInput
      label="Area"
      source="area"
      choices={[
        { id: 'Caja', name: 'Caja' },
        { id: 'Barra', name: 'Barra' },
        { id: 'Mozos', name: 'Mozos' },
        { id: 'Seguridad', name: 'Seguridad' },
        { id: 'Animación', name: 'Animación' },
        { id: 'DJs', name: 'DJs' },
        { id: 'Multimedia', name: 'Multimedia' },
        { id: 'Otros', name: 'Otros' },
      ]}
    />
  </Filter>
);

const UserListActions = () => {
  const notify = useNotify();
  const refresh = useRefresh();
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const downloadUsersBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await fetch('/api/admin/users/backup');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usuarios_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        notify('Backup descargado exitosamente', { type: 'success' });
      } else {
        const j = await res.json().catch(()=>({}));
        const back = j?.message || res.status;
        notify(`Error al descargar backup: ${back}`, { type: 'error' });
      }
    } catch (e: any) {
      notify(`Error de red: ${String(e?.message || e)}`, { type: 'error' });
    } finally {
      setBackupLoading(false);
    }
  };

  const uploadUsersBackup = async () => {
    if (!restoreFile) {
      notify('Selecciona un archivo de backup primero', { type: 'warning' });
      return;
    }

    // Confirmación de seguridad
    const confirmed = window.confirm(
      '⚠️ ADVERTENCIA: Esta acción puede modificar datos existentes.\n\n' +
      '• Los usuarios existentes serán actualizados (excepto contraseñas)\n' +
      '• Los usuarios nuevos serán creados con contraseña dummy\n' +
      '• Se recomienda hacer un backup antes de proceder\n\n' +
      '¿Estás seguro de que quieres continuar?'
    );

    if (!confirmed) return;

    try {
      setRestoreLoading(true);

      // Leer el archivo
      const text = await restoreFile.text();
      let backupData;
      try {
        backupData = JSON.parse(text);
      } catch (e) {
        notify('El archivo no es un JSON válido', { type: 'error' });
        return;
      }

      // Validar estructura básica
      if (!backupData.metadata || !backupData.users || !Array.isArray(backupData.users)) {
        notify('El archivo no tiene la estructura esperada de backup', { type: 'error' });
        return;
      }

      // Enviar a la API
      const formData = new FormData();
      formData.append('backup', restoreFile);

      const res = await fetch('/api/admin/users/backup', {
        method: 'POST',
        body: formData,
      });

      const j = await res.json().catch(()=>({}));
      if (res.ok && j?.ok) {
        notify(j.message || 'Backup restaurado exitosamente', { type: 'success' });
        refresh();
        setRestoreFile(null);
      } else {
        const back = j?.message || res.status;
        notify(`Error al restaurar backup: ${back}`, { type: 'error' });
      }
    } catch (e: any) {
      notify(`Error de red: ${String(e?.message || e)}`, { type: 'error' });
    } finally {
      setRestoreLoading(false);
    }
  };

  const resetAllPasswords = async () => {
    // Confirmación de seguridad
    const confirmed = window.confirm(
      '⚠️ ADVERTENCIA CRÍTICA: Esta acción reseteará TODAS las contraseñas de usuarios.\n\n' +
      '• TODOS los usuarios tendrán la contraseña "123456789"\n' +
      '• Esto afectará a todos los usuarios del sistema\n' +
      '• Se recomienda hacer un backup antes de proceder\n' +
      '• Los usuarios deberán cambiar su contraseña después\n\n' +
      '¿Estás ABSOLUTAMENTE seguro de que quieres continuar?'
    );

    if (!confirmed) return;

    try {
      setResetLoading(true);

      const res = await fetch('/api/admin/users/reset-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: '123456789'
        }),
      });

      const j = await res.json().catch(()=>({}));
      if (res.ok && j?.ok) {
        notify(j.message || 'Contraseñas reseteadas exitosamente', { type: 'success' });
      } else {
        const back = j?.message || res.status;
        notify(`Error al resetear contraseñas: ${back}`, { type: 'error' });
      }
    } catch (e: any) {
      notify(`Error de red: ${String(e?.message || e)}`, { type: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botón Crear Usuario */}
      <div className="flex justify-start">
        <CreateButton />
      </div>

      {/* Sección de Backup y Restauración */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">📥 Descargar Backup</h4>
          <button
            onClick={downloadUsersBackup}
            disabled={backupLoading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {backupLoading ? (
              <>
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                Generando Backup...
              </>
            ) : (
              <>
                📥 Descargar Backup
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">📤 Restaurar desde Backup</h4>
          <input
            id="backup-file"
            type="file"
            accept=".json"
            onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
            className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900 dark:file:text-green-300 dark:hover:file:bg-green-800"
          />
          <button
            onClick={uploadUsersBackup}
            disabled={restoreLoading || !restoreFile}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {restoreLoading ? (
              <>
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                Restaurando...
              </>
            ) : (
              <>
                📤 Restaurar Backup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sección de Reset de Contraseñas */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">🔑 Reset de Contraseñas</h4>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            ⚠️ Esta acción reseteará todas las contraseñas de usuario a "123456789".
            Asegúrate de informar a los usuarios sobre este cambio.
          </p>
          <button
            onClick={resetAllPasswords}
            disabled={resetLoading}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {resetLoading ? (
              <>
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                Reseteando Contraseñas...
              </>
            ) : (
              <>
                🔑 Reset All Passwords
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const UserList = (props: any) => (
  <div>
    <List {...props} filters={<UserFilter />} sort={{ field: 'createdAt', order: 'DESC' }}>
      <Datagrid
        bulkActionButtons={false}
        sx={{
          '& .RaDatagrid-headerCell': {
            fontWeight: 'bold',
            backgroundColor: 'var(--color-bg-soft)',
            color: 'var(--color-text-primary)',
          },
          '& .RaDatagrid-row': {
            '&:hover': {
              backgroundColor: 'var(--color-bg)',
            },
          },
          '& .RaDatagrid-rowCell': {
            color: 'var(--color-text-primary)',
          },
          // Responsive table styles
          '@media (max-width: 768px)': {
            '& .RaDatagrid-headerCell': {
              padding: '8px 4px',
              fontSize: '0.75rem',
            },
            '& .RaDatagrid-rowCell': {
              padding: '8px 4px',
              fontSize: '0.75rem',
            },
          },
          '@media (max-width: 640px)': {
            '& .RaDatagrid-headerCell:nth-of-type(n+6)': {
              display: 'none',
            },
            '& .RaDatagrid-rowCell:nth-of-type(n+6)': {
              display: 'none',
            },
          },
        }}
      >
        <TextField source="username" />
        <TextField source="personName" label="Name" />
        <TextField source="role" />
        <TextField source="area" />
        <TextField source="dni" />
        <TextField source="whatsapp" />
        <DateField source="createdAt" />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>

    {/* Botones de acciones al final de la tabla */}
    <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Acciones de Usuario</h3>
      <UserListActions />
    </div>
  </div>
);
