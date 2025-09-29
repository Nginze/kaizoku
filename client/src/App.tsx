import { BrowserRouter as Router, Routes, Route } from "react-router";
import { Home } from "./pages/home";
import { Watch } from "./pages/watch";
import TanstackProvider from "./lib/tanstack";
import "./App.css";

function App() {
  return (
    <>
      <TanstackProvider>
        <Router>
          <Routes>
            <Route index element={<Home />} />
            {/* <Route path="/watch" element={<Watch />} /> */}
            <Route path="/about" element={<h1>About</h1>} />
          </Routes>
        </Router>
      </TanstackProvider>
    </>
  );
}

export default App;
