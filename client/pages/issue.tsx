/* eslint-disable @next/next/no-img-element */
import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import config from "../config/config.json";
import axios, { AxiosResponse } from "axios";
import { useRouter } from "next/router";

const Issue: NextPage = () => {
    const [error2, setError2] = useState<string>();
    const [form, setForm] = useState<Number>();
    const router = useRouter();
    useEffect(() => {
        if (!window.localStorage.getItem("token")) {
            router.push("/login");
        }
    }, [router]);
    return (
        <>
            <Head>
                <title>CRU - Gerar Tokens</title>
            </Head>
            <div className="h-screen bg-gradient-to-b from-[#2B0245] via-[#2B0245] to-[#FEB93F] flex flex-col justify-between">
                <header className="z-10">
                    <img
                        src="/arrow-left-solid.svg"
                        alt="voltar"
                        className="w-20 ml-60 mt-24 hidden md:block md:hover:cursor-pointer"
                        onClick={router.back}
                    />
                </header>
                <main className="md:flex md:justify-evenly -mt-24 z-0 md:mr-auto md:ml-auto">
                    <img
                        src="/cru.png"
                        alt="cru"
                        className="mx-auto md:my-auto md:mr-80 shadow-md"
                    />
                    <form
                        onSubmit={async (event) => {
                            event.preventDefault();
                            if (!window.localStorage.getItem("token")) {
                                router.push("/login");
                            }
                            (
                                document.getElementById(
                                    "submitButton"
                                ) as HTMLInputElement
                            ).disabled = true;
                            (
                                document.getElementById(
                                    "submitButton"
                                ) as HTMLInputElement
                            ).className += " opacity-50";
                            axios
                                .post(
                                    config.server + "/issue",
                                    { amount: form },
                                    {
                                        headers: {
                                            Authorization:
                                                "Bearer " +
                                                window.localStorage.getItem(
                                                    "token"
                                                ),
                                        },
                                    }
                                )
                                .then((_: AxiosResponse) => {
                                    setError2("✅ Tokens criados!");
                                    setTimeout(
                                        router.push.bind(null, "/"),
                                        1500
                                    );
                                })
                                .catch((e) => {
                                    console.log(e);
                                    if (axios.isAxiosError(e))
                                        setError2(
                                            "Erro: " +
                                                e.response?.data["result"]
                                        );
                                });
                        }}
                    >
                        <label className="text-white mx-auto block overflow-hidden max-w-[12rem] md:max-w-full text-lg break-words text-center">
                            Informe o número de tokens a serem gerados:
                        </label>
                        <div className="flex justify-evenly">
                            <input
                                onChange={(e) => {
                                    setForm(Number(e.target.value));
                                }}
                                required
                                type={"number"}
                                step={0.1}
                                className="w-5/12 ml-28 mt-2 rounded-xl h-10"
                            ></input>
                        </div>
                        <button
                            id="submitButton"
                            type="submit"
                            className="mt-8 w-full text-center bg-[#FEB93F] py-3 rounded-xl text-lg drop-shadow-md"
                        >
                            Emitir
                        </button>
                        {error2 ? (
                            <p className="text-white text-center mt-2 ml-2">
                                {error2}
                            </p>
                        ) : null}
                    </form>
                </main>
                <footer className="py-2 text-center  text-white font-bolder flex justify-center content-center">
                    <span className="block my-auto">Copyleft 🐀</span>
                </footer>
            </div>
        </>
    );
};

export default Issue;
