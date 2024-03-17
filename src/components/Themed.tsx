import { StyledEngineProvider, ThemeProvider } from "@mui/material";
import * as React from "react";
import { theme } from "./Theme";

export const Themed: React.FunctionComponent<React.PropsWithChildren<{}>> = (
  props
) => (
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>{props.children}</ThemeProvider>
  </StyledEngineProvider>
);
