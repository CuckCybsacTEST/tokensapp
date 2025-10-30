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

  return (
    <TopToolbar>
      <CreateButton />
      <div className="flex items-center gap-2 ml-4">
        <input
          id="backup-file"
          type="file"
          accept=".json"
          onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
          className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
        />
        <button
          onClick={uploadUsersBackup}
          disabled={restoreLoading || !restoreFile}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm rounded transition-colors flex items-center gap-1"
        >
          {restoreLoading ? (
            <>
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              Restaurando...
            </>
          ) : (
            <>
              📤 Restaurar
            </>
          )}
        </button>
      </div>
      <button
        onClick={downloadUsersBackup}
        disabled={backupLoading}
        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded transition-colors flex items-center gap-1 ml-2"
      >
        {backupLoading ? (
          <>
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
            Generando...
          </>
        ) : (
          <>
            📥 Backup
          </>
        )}
      </button>
    </TopToolbar>
  );
};

export const UserList = (props: any) => (
  <List {...props} filters={<UserFilter />} sort={{ field: 'createdAt', order: 'DESC' }} actions={<UserListActions />}>
    <Datagrid
      bulkActionButtons={false}
      sx={{
        '& .RaDatagrid-headerCell': {
          fontWeight: 'bold',
          backgroundColor: '#f8fafc',
        },
        '& .RaDatagrid-row': {
          '&:hover': {
            backgroundColor: '#f1f5f9',
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
);