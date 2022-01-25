/* eslint-disable @next/next/no-img-element */
import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import config from "../config/config.json";
import axios, { Axios, AxiosResponse } from "axios";
import faker, { phone } from "faker";
import { useRouter } from "next/router";

const Transfer: NextPage = () => {
    const [error1, setError1] = useState<string>();
    const [error2, setError2] = useState<string>();
    const [query, setQuery] = useState<string>();
    const [form, setForm] = useState<Record<string, string | Number>>({
        to: "",
        amount: Number(0),
    });
    const router = useRouter();
    useEffect(() => {
        if (!window.localStorage.getItem("token")) {
            router.push("/login");
        }
    }, [router]);
    return (
        <>
            <Head>
                <title>CRU - Transferência</title>
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
                            axios
                                .post(config.server + "/transfer", form, {
                                    headers: {
                                        Authorization:
                                            "Bearer " +
                                            window.localStorage.getItem(
                                                "token"
                                            ),
                                    },
                                })
                                .then((res: AxiosResponse) => {
                                    setError2("✅ Enviado!");
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
                            Informe a matrícula do destinatário:
                        </label>
                        <div className="flex justify-evenly">
                            <input
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setForm({
                                        ...form,
                                        ["to"]: e.target.value,
                                    });
                                }}
                                required
                                className="w-5/12 ml-28 mt-2 rounded-xl h-10"
                            ></input>
                            <img
                                src="/search-solid.svg"
                                alt="buscar"
                                className="-ml-6 mt-2 w-9 md:hover:cursor-pointer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    axios
                                        .get(
                                            config.server +
                                                "/transfer?search=true&query=" +
                                                query,
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
                                        .then((res: AxiosResponse) => {
                                            setError1(
                                                "✅ usuário válido encontrado!"
                                            );
                                        })
                                        .catch((e) => {
                                            if (axios.isAxiosError(e))
                                                setError1(
                                                    "❌ usuário não encontrado"
                                                );
                                        });
                                }}
                            />
                        </div>
                        {error1 ? (
                            <p className="text-white text-center mt-2 ml-2">
                                {error1}
                            </p>
                        ) : null}
                        <div className="flex mt-10">
                            <label className="text-white ml-20 py-2 text-lg">
                                Montante a enviar:
                            </label>
                            <input
                                onChange={(e) => {
                                    setForm({
                                        ...form,
                                        ["amount"]: e.target.value,
                                    });
                                }}
                                required
                                type={"number"}
                                className="w-3/12 rounded-xl h-10 ml-4"
                            ></input>
                        </div>
                        <button
                            type="submit"
                            className="mt-8 w-full text-center bg-[#FEB93F] py-3 rounded-xl text-lg drop-shadow-md"
                        >
                            Transferir
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

export default Transfer;
