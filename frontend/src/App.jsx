import { Routes, Route } from "react-router";
import Layout from "./Layout.jsx";
import Home from "./Home.jsx";
import Login from "./Login.jsx";
import Registro from "./Registro.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Registro />} />
        <Route path="*" element={<p className="panel">Página no encontrada.</p>} />
      </Route>
    </Routes>
  );
}

export default App;
