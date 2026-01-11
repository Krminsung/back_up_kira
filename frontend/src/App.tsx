import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Create from './pages/Create';
import Chat from './pages/Chat';
import CharacterDetail from './pages/CharacterDetail';
import MyPage from './pages/MyPage';
import Characters from './pages/Characters';
import Layout from './components/Layout'; // We need to create this

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/login" element={<Layout><Login /></Layout>} />
      <Route path="/register" element={<Layout><Register /></Layout>} />
      <Route path="/characters" element={<Layout><Characters /></Layout>} />
      <Route path="/create" element={<Layout><Create /></Layout>} />
      <Route path="/characters/:id" element={<Layout><CharacterDetail /></Layout>} />
      <Route path="/characters/:id/chat" element={<Layout><Chat /></Layout>} />
      <Route path="/chat/:id" element={<Layout><Chat /></Layout>} />
      <Route path="/my" element={<Layout><MyPage /></Layout>} />
    </Routes>
  );
}

export default App;
