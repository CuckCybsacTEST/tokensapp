import {
  Create,
  SimpleForm,
  TextInput,
  DateInput,
  SelectInput,
  required,
  email,
  minLength,
} from 'react-admin';

const validateDni = [required(), minLength(8, 'DNI debe tener al menos 8 caracteres')];
const validateName = [required()];
const validatePhone = [required(), minLength(9, 'Teléfono debe tener al menos 9 caracteres')];
const validateEmail = [email()];

export const CustomerCreate = (props: any) => (
  <Create {...props}>
    <SimpleForm>
      <TextInput source="dni" label="DNI" validate={validateDni} />
      <TextInput source="name" label="Nombre completo" validate={validateName} />
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
        defaultValue="MEMBER"
        validate={required()}
      />
    </SimpleForm>
  </Create>
);
