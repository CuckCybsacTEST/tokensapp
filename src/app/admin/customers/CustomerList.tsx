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
  FunctionField,
} from 'react-admin';
import Link from 'next/link';

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

// Componente para mostrar estado de sesión con enlace
const SessionStatus = ({ record }: { record: any }) => {
  return (
    <Link
      href={`/admin/customer-sessions?customerId=${record.id}`}
      className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-xs transition-colors"
    >
      Ver sesiones
    </Link>
  );
};

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
      <FunctionField label="Sesiones" render={SessionStatus} />
      <EditButton />
      <DeleteButton />
    </Datagrid>
  </List>
);
