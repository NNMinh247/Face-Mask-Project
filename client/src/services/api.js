import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const registerUser = async (name, images) => {
    const formData = new FormData();
    formData.append('name', name);
    images.forEach((blob) => {
        formData.append('files', blob, 'image.jpg');
    });
    const response = await axios.post(`${API_URL}/register/`, formData);
    return response.data;
};

export const recognizeUser = async (imageBlob) => {
    const formData = new FormData();
    formData.append('file', imageBlob, 'checkin.jpg');
    const response = await axios.post(`${API_URL}/recognize/`, formData);
    return response.data;
};

export const fetchHistory = async () => {
    const response = await axios.get(`${API_URL}/history/`); 
    return response.data;
};

export const checkMaskQuick = async (imageBlob) => {
    const formData = new FormData();
    formData.append('file', imageBlob, 'check.jpg');
    const response = await axios.post(`${API_URL}/check-mask/`, formData);
    return response.data.mask;
};