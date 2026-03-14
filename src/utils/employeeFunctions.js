import { auth } from "../firebase";

const call = async (url, body) => {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error en la función");
  return data;
};

export const createEmployee = (payload) =>
  call(process.env.REACT_APP_FN_CREATE_EMPLOYEE, payload);

export const deleteEmployee = (uid) =>
  call(process.env.REACT_APP_FN_DELETE_EMPLOYEE, { uid });