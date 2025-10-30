import {
  List,
  Datagrid,
  TextField,
  EmailField,
  DateField,
  NumberField,
  BooleanField,
  EditButton,
  DeleteButton,
  Filter,
  TextInput,
  SelectInput,
  BooleanInput,
} from 'react-admin';

const CustomerFilter = (props: any) => (
  <Filter {...props}>
    <TextInput label="Buscar" source="search" alwaysOn />
    <SelectInput
      label="Nivel de Membresía"
      source="membershipLevel"
      choices={[
        { id: 'VIP', name: 'VIP' },
        { id: 'MEMBER', name: 'Miembro' },
        { id: 'GUEST', name: 'Invitado' },
      ]}
    />
    <BooleanInput label="Activo" source="isActive" />
  </Filter>
);

export const CustomerList = (props: any) => (
  <List {...props} filters={<CustomerFilter />} perPage={25} sort={{ field: 'createdAt', order: 'DESC' }}>
    <Datagrid>
      <TextField source="dni" label="DNI" />
      <TextField source="name" label="Nombre" />
      <EmailField source="email" label="Email" />
      <TextField source="phone" label="Teléfono" />
      <TextField source="membershipLevel" label="Membresía" />
      <NumberField source="points" label="Puntos" />
      <NumberField source="totalSpent" label="Total Gastado" options={{ style: 'currency', currency: 'PEN' }} />
      <NumberField source="visitCount" label="Visitas" />
      <DateField source="lastVisit" label="Última Visita" />
      <BooleanField source="isActive" label="Activo" />
      <DateField source="createdAt" label="Creado" />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);