import { auth } from '../firebase'
// firstfunction : creates new users
// SECOND FUNCTION / logs users in
// THINRD FUNCTION : logs users out
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth'

export const signUp = (email,password) => 
    createUserWithEmailAndPassword(auth,email,password)


export const login = (email,password)  => 
    signInWithEmailAndPassword(auth,email,password)


export const logout= () => signOut(auth)