"use client";

import {
  List,
  Datagrid,
  TextField,
  DateField,
  EditButton,
  DeleteButton,
  Filter,
  TextInput,
  SelectInput,
} from 'react-admin';

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
  </div>
);
