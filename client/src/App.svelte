<script>
  import { Router, Link, Route } from 'svelte-routing';
  import { Toaster } from 'svelte-sonner';

  import Sidebar from './components/Sidebar/Sidebar.svelte';
  import Login from './pages/Login/Login.svelte';
  import Register from './pages/Register/Register.svelte';
  import Landing from './pages/Landing/Landing.svelte';
  import Home from './pages/Home/Home.svelte';
  import CreateRecipe from './pages/CreateRecipe/CreateRecipe.svelte';
  import EditRecipe from './pages/EditRecipe/EditRecipe.svelte';
  import Discover from './pages/Discover/Discover.svelte';
  import Recipe from './pages/Recipe/Recipe.svelte';
  import Profile from './pages/Profile/Profile.svelte';
  

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

    <Route path='/createRecipe'>
      <PrivateRoute>
        <CreateRecipe />
      </PrivateRoute>
    </Route>

    <Route path='/profile'>
      <PrivateRoute>
        <Profile /> 
      </PrivateRoute>
    </Route>

    <Route path='/discover'>
      <PrivateRoute>
          <Discover />
      </PrivateRoute>
    </Route>

    <Route path='/recipes/:id/edit' let:params>
      <PrivateRoute>
        <EditRecipe id={params.id} />
      </PrivateRoute>
    </Route>

    <Route path='/recipes/:id' let:params>
      <PrivateRoute>
        <Recipe id={params.id} />
      </PrivateRoute>
    </Route>

    

    

    </div> 
  </div>
</Router>