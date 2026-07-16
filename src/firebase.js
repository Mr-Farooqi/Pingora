import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAmMA2DUS9WRaWlyYjrPHQd_dlxE00THko",
  authDomain: "my-chat-app-e0204.firebaseapp.com",
  databaseURL: "https://my-chat-app-e0204-default-rtdb.firebaseio.com",
  projectId: "my-chat-app-e0204",
  storageBucket: "my-chat-app-e0204.firebasestorage.app",
  messagingSenderId: "160814191731",
  appId: "1:160814191731:web:208e9ace7f9e46d3ebc606"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);