"use client";

import { useEffect, useState } from 'react';
import { Admin, Resource, Layout } from 'react-admin';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { dataProvider } from '@/lib/react-admin-data-provider';
import { UserList } from './UserList';
import { UserCreate } from './UserCreate';
import { UserEdit } from './UserEdit';

// Custom theme to match the existing design
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0ea5e9', // brand-500
      light: '#38bdf8', // brand-400
      dark: '#0284c7', // brand-600
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#075985', // brand-800
      light: '#0369a1', // brand-700
      dark: '#0c4a6e', // brand-900
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
  },
  typography: {
    fontFamily: 'system-ui, Inter, Segoe UI, Roboto, Arial, sans-serif',
    h4: {
      fontWeight: 600,
      color: '#1e293b',
    },
    h6: {
      fontWeight: 600,
      color: '#1e293b',
    },
  },
  components: {
    MuiTableContainer: {
      styleOverrides: {
        root: {
          overflowX: 'auto',
          borderRadius: 8,
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          minWidth: 800,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
          },
        },
      },
    },
  },
});

// Custom layout without menu
const CustomLayout = ({ children, ...props }: any) => (
  <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
    {children}
  </div>
);

export default function ReactAdminClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading React Admin...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <Admin
            dataProvider={dataProvider}
            theme={theme}
            disableTelemetry
            layout={CustomLayout}
          >
            <Resource
              name="users"
              list={UserList}
              create={UserCreate}
              edit={UserEdit}
            />
          </Admin>
        </div>
      </div>
    </ThemeProvider>
  );
}