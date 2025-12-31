import { BrowserRouter as Router, Routes, Route } from "react-router";
import { Home } from "./pages/home";
import { Watch } from "./pages/watch";
import TanstackProvider from "./lib/tanstack";
import "./App.css";
import { Filter } from "./pages/filter";
import About from "./pages/about";
import { Toaster } from "sonner";
import { AuthProvider } from "./features/authentication/contexts/auth-context";

function App() {
  return (
    <>
      <TanstackProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route index element={<Home />} />
              <Route path="/filter" element={<Filter />} />
              <Route path="/watch/:animeId" element={<Watch />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </Router>
          <Toaster position="bottom-right" />
        </AuthProvider>
      </TanstackProvider>
    </>
  );
}

export default App;
