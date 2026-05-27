<script>
  import { Router, Link, Route } from 'svelte-routing';
  import { Toaster } from 'svelte-sonner';
  import Sidebar from './components/Sidebar/Sidebar.svelte';
  import Login from './pages/Login/Login.svelte';
  import Register from './pages/Register/Register.svelte';
  import Landing from './pages/Landing/Landing.svelte';
  import Home from './pages/Home/Home.svelte';
  import PrivateRoute from './components/PrivateRoute/PrivateRoute.svelte';
</script>

<Toaster/>
<Router>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content" >
    <Route path='/'><Landing /></Route>
    <Route path='/login'><Login /></Route>
    <Route path='/register'><Register /></Route>
    <Route path='/home'>
      <PrivateRoute>
        <Home />
      </PrivateRoute>
    </Route>

  </div> 
  
    
  </div>
</Router>