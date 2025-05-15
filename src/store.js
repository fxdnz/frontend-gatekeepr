// store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./reducers/auth"; // import your reducer directly

const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  // Middleware like thunk is included by default
  devTools: import.meta.env.MODE !== "production",
});

export default store;
