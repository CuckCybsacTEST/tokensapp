"use client";

import {
  Create,
  SimpleForm,
  TextInput,
  PasswordInput,
  SelectInput,
  DateInput,
  required,
  SaveButton,
  Toolbar,
  useRedirect,
  useResourceContext,
} from 'react-admin';
import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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

const CustomToolbar = () => {
  const redirect = useRedirect();
  const resource = useResourceContext();

  return (
    <Toolbar
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column-reverse', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: { xs: 1.5, sm: 2 },
        mt: { xs: 2, sm: 0 },
      }}
    >
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => redirect('list', resource ?? 'users')}
        sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
      >
        Volver a lista
      </Button>
      <SaveButton
        label="Guardar usuario"
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      />
    </Toolbar>
  );
};

export const UserCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm
      toolbar={<CustomToolbar />}
      sx={{
        maxWidth: { xs: '100%', sm: '95%', md: '85%', lg: 1200 },
        mx: 'auto',
        px: { xs: 1.5, sm: 3, md: 4 },
        '& .MuiTextField-root': {
          mb: 2,
        },
        '& .MuiFormControl-root': {
          mb: 2,
        },
      }}
    >
      {/* Primera fila: Username y Password */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(280px, 1fr))' },
          gap: { xs: 1.5, sm: 2.5 },
          width: '100%',
          mb: { xs: 2, sm: 2.5 },
        }}
      >
        <TextInput source="username" validate={required()} fullWidth />
        <PasswordInput source="password" validate={required()} fullWidth />
      </Box>

      {/* Segunda fila: Name y DNI */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(280px, 1fr))' },
          gap: { xs: 1.5, sm: 2.5 },
          width: '100%',
          mb: { xs: 2, sm: 2.5 },
        }}
      >
        <TextInput source="personName" label="Name" validate={required()} fullWidth />
        <TextInput source="dni" fullWidth />
      </Box>

      {/* Tercera fila: Role y Area */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(280px, 1fr))' },
          gap: { xs: 1.5, sm: 2.5 },
          width: '100%',
          mb: { xs: 2, sm: 2.5 },
        }}
      >
        <SelectInput source="role" choices={roleChoices} validate={required()} fullWidth />
        <SelectInput source="area" choices={areaChoices} fullWidth />
      </Box>

      {/* Cuarta fila: WhatsApp y Birthday */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(280px, 1fr))' },
          gap: { xs: 1.5, sm: 2.5 },
          width: '100%',
        }}
      >
        <TextInput source="whatsapp" fullWidth />
        <DateInput source="birthday" label="Birthday" fullWidth />
      </Box>
    </SimpleForm>
  </Create>
);
