import axios from "axios";
import {api_url} from "@/constants";

export const apiClient = axios.create({
    baseURL: api_url,
    headers: {
        'Content-Type': 'application/json'
    }
})