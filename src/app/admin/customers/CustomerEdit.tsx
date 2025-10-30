import {
  Edit,
  SimpleForm,
  TextInput,
  DateInput,
  SelectInput,
  BooleanInput,
  email,
  minLength,
  Labeled,
  NumberField,
  DateField,
} from 'react-admin';

const validatePhone = [minLength(9, 'Teléfono debe tener al menos 9 caracteres')];
const validateEmail = [email()];

export const CustomerEdit = (props: any) => (
  <Edit {...props}>
    <SimpleForm>
      <TextInput source="dni" label="DNI" disabled />
      <TextInput source="name" label="Nombre completo" />
      <TextInput source="email" label="Email" validate={validateEmail} />
      <TextInput source="phone" label="Teléfono" validate={validatePhone} />
      <TextInput source="whatsapp" label="WhatsApp" />
      <DateInput source="birthday" label="Fecha de nacimiento" />
      <SelectInput
        source="membershipLevel"
        label="Nivel de Membresía"
        choices={[
          { id: 'VIP', name: 'VIP' },
          { id: 'MEMBER', name: 'Miembro' },
          { id: 'GUEST', name: 'Invitado' },
        ]}
      />
      <BooleanInput source="isActive" label="Activo" />

      {/* Read-only fields for statistics */}
      <Labeled label="Estadísticas">
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
          <NumberField source="points" label="Puntos" />
          <NumberField source="totalSpent" label="Total Gastado" options={{ style: 'currency', currency: 'PEN' }} />
          <NumberField source="visitCount" label="Número de Visitas" />
          <DateField source="lastVisit" label="Última Visita" />
        </div>
      </Labeled>
    </SimpleForm>
  </Edit>
);