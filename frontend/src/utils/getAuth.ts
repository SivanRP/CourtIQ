
export const getAuth = async (url: string, options: any = {}, router: any) => {
    const token = localStorage.getItem("token");

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });

    if (response.status === 401) {
        localStorage.removeItem("token");
        router.push("/");
        return null;
    }

    return response;
};