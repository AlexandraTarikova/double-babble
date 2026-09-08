import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#D5B9B2',
    },
    text: {
      primary: '#D5B9B2',
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        disableFocusRipple: true,
        disableTouchRipple: true,
        disableRipple: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          minWidth: 60,
          borderRadius: 8,

          fontWeight: 'normal',
          fontFamily: 'Roboto Mono, monospace',
          letterSpacing: '0.1px',

          textTransform: 'none',
          color: theme.palette.text.primary,
        }),
        sizeLarge: {
          fontSize: 32,
        },
        sizeMedium: {
          fontSize: 24,
        },
        sizeSmall: {
          fontSize: 12,
        },
        text: {
          ['&:hover']: {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: ({}) => ({
          fontSize: 24,
          fontFamily: 'Roboto Mono, monospace',
          color: 'white',
        }),
      },
    },
  },
});
