import { BrowserRouter as Router, Routes, Route } from "react-router";
import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Home } from "./pages/Home";
import { Watch } from "./pages/Watch";

function App() {
  const queryClient = new QueryClient();
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route index element={<Home />} />
            <Route path="/watch" element={<Watch />} />
            <Route path="/about" element={<h1>About</h1>} />
          </Routes>
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </>
  );
}

export default App;
