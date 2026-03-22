import { LiraShell } from "@/app/shell/lira-shell";
import { ThemeProvider } from "@/theme/theme-provider";
import "@/styles/globals.css";

function App() {
  return (
    <ThemeProvider>
      <LiraShell />
    </ThemeProvider>
  );
}

export default App;
