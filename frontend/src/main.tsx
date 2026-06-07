import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import App from './App';
import theme from './theme';
import './index.css';

// Import fonts (self-hosted via @fontsource — no render-blocking external request).
// Inter is the single UI typeface across headings and body.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
        <Toaster
          position='bottom-center'
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              paddingRight: 4,
            },
          }}
        >
          {t => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <>
                  {icon}
                  {message}
                  {/* Loading toasts dismiss themselves once the promise settles,
                      so a manual close button would be misleading there. */}
                  {t.type !== 'loading' && (
                    <IconButton
                      size='small'
                      aria-label='Dismiss notification'
                      onClick={() => toast.dismiss(t.id)}
                      sx={{ color: 'inherit', ml: 0.5 }}
                    >
                      <CloseIcon fontSize='small' />
                    </IconButton>
                  )}
                </>
              )}
            </ToastBar>
          )}
        </Toaster>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
