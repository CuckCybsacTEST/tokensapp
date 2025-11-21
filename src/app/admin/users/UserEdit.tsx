"use client";

import {
  Edit,
  SimpleForm,
  TextInput,
  PasswordInput,
  SelectInput,
  DateInput,
  required,
} from 'react-admin';

const roleChoices = [
  { id: 'COLLAB', name: 'Collaborator' },
  { id: 'STAFF', name: 'Staff' },
  { id: 'ADMIN', name: 'Admin' },
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

export const UserEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm
      sx={{
        maxWidth: 600,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        '& .MuiTextField-root': {
          mb: { xs: 2, sm: 1 },
        },
        '& .MuiFormControl-root': {
          mb: { xs: 2, sm: 1 },
        },
      }}
    >
      <TextInput source="username" validate={required()} fullWidth />
      <PasswordInput source="password" label="New Password (leave empty to keep current)" fullWidth />
      <TextInput source="personName" label="Name" validate={required()} fullWidth />
      <TextInput source="dni" fullWidth />
      <SelectInput source="role" choices={roleChoices} validate={required()} fullWidth />
      <SelectInput source="area" choices={areaChoices} fullWidth />
      <TextInput source="whatsapp" fullWidth />
      <DateInput source="birthday" label="Birthday" fullWidth />
    </SimpleForm>
  </Edit>
);
