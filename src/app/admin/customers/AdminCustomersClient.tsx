'use client';

import { Admin, Resource, ListGuesser, EditGuesser } from 'react-admin';
import simpleRestProvider from 'ra-data-simple-rest';
import { CustomerList } from './CustomerList';
import { CustomerCreate } from './CustomerCreate';
import { CustomerEdit } from './CustomerEdit';

const dataProvider = simpleRestProvider('/api');

export function CustomerAdmin() {
  return (
    <Admin dataProvider={dataProvider}>
      <Resource
        name="customers"
        list={CustomerList}
        create={CustomerCreate}
        edit={CustomerEdit}
      />
    </Admin>
  );
}