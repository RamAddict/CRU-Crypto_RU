/* eslint-disable @next/next/no-img-element */
import axios from "axios";
import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import config from "../config/config.json";

const Login: NextPage = () => {
    const router = useRouter();
    const [form, setForm] = useState<Record<string, string>>({
        Matrícula: "",
        Senha: "",
    });
    const [error, setError] = useState<string>();
    return (
        <>
            <Head>
                <title>CRU - Login</title>
            </Head>
            <div className="h-screen bg-gradient-to-b from-[#2B0245] via-[#2B0245] to-[#FEB93F] flex flex-col">
                {/* <header></header> */}
                <main className=" flex flex-col my-auto">
                    <img
                        src="/cru.png"
                        alt="cru"
                        className="mx-auto md:my-auto"
                    />

                    <form
                        onSubmit={async (event) => {
                            event.preventDefault();
                            console.log(form);
                            try {
                                const res = await axios.post(
                                    config.server + "/login",
                                    form
                                );
                                const token = res.data["token"];
                                window.localStorage.setItem("token", token);
                                // redirect
                                router.push("/");
                                console.log(res.data["token"]);
                            } catch (e) {
                                if (axios.isAxiosError(e)) {
                                    setError(
                                        `Encountered following error: ${
                                            e.response?.data["result"] as string
                                        }`
                                    );
                                }
                            }
                        }}
                        className="max-w-full px-10 space-y-10 md:max-w-xl mx-auto md:my-auto"
                    >
                        <p className="text-white block text-center mx-auto my-auto">
                            Welcome, please sign in or create an account
                        </p>
                        {["Matrícula", "Senha"].map((field: string) => (
                            <fieldset
                                key={field}
                                className="flex justify-between"
                            >
                                <label className="text-white block text-center text-2xl my-auto mr-auto">
                                    {field}
                                </label>
                                <input
                                    required
                                    value={form[field]}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            [field]: e.target.value,
                                        })
                                    }
                                    className="w-7/12 rounded-xl h-10"
                                    type={
                                        field === "E-mail"
                                            ? "email"
                                            : field === "Senha"
                                            ? "password"
                                            : "text"
                                    }
                                />
                            </fieldset>
                        ))}
                        {error ? (
                            <p className="text-white font-bolder">{error}</p>
                        ) : null}
                        <button
                            className="w-full text-center bg-[#FEB93F] py-3 rounded-xl text-lg drop-shadow-md"
                            type="submit"
                        >
                            Login
                        </button>
                        <p className="text-white block text-center mx-auto my-auto hover:underline">
                            <a href="/register">Create account</a>
                        </p>
                    </form>
                    {/* <button
                        className="w-full text-center bg-[#FEB93F] py-3 rounded-xl text-lg drop-shadow-md"
                        onClick={async (e) => {
                            const debug = await axios.get(
                                config.server + "/getBalance/admin",
                                { params: { walletId: "admin" } }
                            );
                            console.log(config.server + "/getBalance/admin");
                            console.log(debug);
                        }}
                    >
                        do
                    </button> */}
                </main>
                <footer className="py-2 text-center  text-white font-bolder flex justify-center content-center">
                    <span className="block my-auto ml-auto mr-auto md:flex-grow">
                        Copyleft 🐀
                    </span>
                </footer>
            </div>
        </>
    );
};

export default Login;
