"use client";

import { DataProvider, fetchUtils } from 'react-admin';
import { stringify } from 'query-string';

const apiUrl = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_API_URL || '';

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
    const { field, order } = params.sort || { field: 'id', order: 'ASC' };
    const query = {
      sort: JSON.stringify([field, order]),
      range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
      filter: JSON.stringify(params.filter),
    };
    const url = `/api/admin/${resource}?${stringify(query)}`;

    const { json } = await fetchUtils.fetchJson(url, {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
    });

    // Handle different response formats
    const data = json.data || json.users || json.persons || json[resource] || [];
    const total = json.total || json.data?.length || json.users?.length || json.persons?.length || json[resource]?.length || 0;

    return {
      data,
      total,
    };
  },

  getOne: async (resource, params) => {
    const url = `/api/admin/${resource}/${params.id}`;

    const { json } = await fetchUtils.fetchJson(url, {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
    });

    return {
      data: json.data || json,
    };
  },

  getMany: async (resource, params) => {
    const query = {
      filter: JSON.stringify({ id: params.ids }),
    };
    const url = `/api/admin/${resource}?${stringify(query)}`;

    const { json } = await fetchUtils.fetchJson(url, {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
    });

    return {
      data: json.data || json.users || json[resource] || [],
    };
  },

  getManyReference: async (resource, params) => {
    const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
    const { field, order } = params.sort || { field: 'id', order: 'ASC' };
    const query = {
      sort: JSON.stringify([field, order]),
      range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
      filter: JSON.stringify({
        ...params.filter,
        [params.target]: params.id,
      }),
    };
    const url = `/api/admin/${resource}?${stringify(query)}`;

    const { json } = await fetchUtils.fetchJson(url, {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
    });

    return {
      data: json.data || json.users || json[resource] || [],
      total: json.total || json.data?.length || json.users?.length || json[resource]?.length || 0,
    };
  },

  create: async (resource, params) => {
    const url = `/api/admin/${resource}`;

    // Transform data for the API
    let dataToSend = params.data;

    if (resource === 'users') {
      // Transform React Admin data to match API expectations
      dataToSend = {
        username: params.data.username,
        password: params.data.password,
        role: params.data.role,
        person: {
          name: params.data.personName,
          dni: params.data.dni,
          area: params.data.area,
          whatsapp: params.data.whatsapp,
          birthday: params.data.birthday,
        }
      };
    }

    const { json } = await fetchUtils.fetchJson(url, {
      method: 'POST',
      body: JSON.stringify(dataToSend),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
    });

    return {
      data: json.user || json.data || json,
    };
  },

  update: async (resource, params) => {
    const url = `/api/admin/${resource}/${params.id}`;

    // Transform data for the API
    let dataToSend = params.data;

    if (resource === 'users') {
      // Transform React Admin data to match PATCH API expectations
      dataToSend = {
        personName: params.data.personName,
        role: params.data.role,
        area: params.data.area,
        whatsapp: params.data.whatsapp,
      };

      // Include password only if provided
      if (params.data.password && params.data.password.trim() !== '') {
        dataToSend.password = params.data.password;
      }
    }

    const { json } = await fetchUtils.fetchJson(url, {
      method: 'PATCH',
      body: JSON.stringify(dataToSend),
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
    });

    return {
      data: json.data || json,
    };
  },

  updateMany: async (resource, params) => {
    const responses = await Promise.all(
      params.ids.map(id =>
        fetchUtils.fetchJson(`/api/admin/${resource}/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(params.data),
          headers: new Headers({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      )
    );

    return {
      data: responses.map(response => response.json.data || response.json),
    };
  },

  delete: async (resource, params) => {
    const url = `/api/admin/${resource}/${params.id}`;

    const { json } = await fetchUtils.fetchJson(url, {
      method: 'DELETE',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
    });

    return {
      data: json.data || json,
    };
  },

  deleteMany: async (resource, params) => {
    const responses = await Promise.all(
      params.ids.map(id =>
        fetchUtils.fetchJson(`/api/admin/${resource}/${id}`, {
          method: 'DELETE',
          headers: new Headers({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
        })
      )
    );

    return {
      data: responses.map(response => response.json.data || response.json),
    };
  },
};
