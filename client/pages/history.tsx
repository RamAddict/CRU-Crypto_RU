/* eslint-disable @next/next/no-img-element */
import axios, { AxiosResponse } from "axios";
import type { NextPage, NextApiRequest, NextApiResponse } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import config from "../config/config.json";
import { useEffect, useState } from "react";
import { format } from "date-fns";

const Home: NextPage = () => {
    const router = useRouter();
    const [history, setHistory] =
        useState<
            Array<{ from: string; to: string; amount: Number; date: string }>
        >();
    useEffect(() => {
        if (!window.localStorage.getItem("token")) {
            router.push("/login");
        } else {
            axios
                .get(config.server + "/history", {
                    headers: {
                        Authorization:
                            "Bearer " + window.localStorage.getItem("token"),
                    },
                })
                .then((res: AxiosResponse) => {
                    console.log(res);
                    setHistory(res.data.history);
                })
                .catch((e) => {
                    console.log(e);
                    if (e.response?.data["result"] === "expired")
                        router.push("/login");
                });
        }
    }, [router]);

    return (
        <>
            <Head>
                <title>CRU</title>
            </Head>
            <div className="h-screen bg-gradient-to-b from-[#2B0245] via-[#2B0245] to-[#FEB93F] flex flex-col justify-between">
                <header className="z-10 absolute">
                    <img
                        src="/arrow-left-solid.svg"
                        alt="voltar"
                        className="w-20 ml-60 mt-24 hidden md:block md:hover:cursor-pointer"
                        onClick={router.back}
                    />
                </header>
                <main className="md:flex-grow flex-col my-auto">
                    {/* <section className="text-white text-center mx-auto my-auto flex flex-grow"> */}
                    <img
                        src="/cru.png"
                        alt="cru"
                        className="mx-auto md:my-auto md:mr-80 shadow-md"
                    />

                    <section className="space-y-4">
                        <p className="block text-white text-center mx-auto my-auto">
                            Histórico:
                        </p>
                        <div className="grid grid-cols-4 text-white max-w-5xl px-8 mx-auto text-center text-sm md:text-xl">
                            <span>Data</span>
                            <span>De</span>
                            <span>Para</span>
                            <span>Valor</span>
                        </div>
                        <div className="grid auto-rows-auto gap-4 max-w-5xl px-8 mx-auto text-center text-sm md:text-xl">
                            {history ? (
                                history.length !== 0 ? (
                                    history.map((transaction) => (
                                        <div
                                            key={transaction.date}
                                            className="grid grid-cols-4 text-white border"
                                        >
                                            <span>
                                                {format(
                                                    new Date(transaction.date),
                                                    "dd/MM/yyyy H:MM"
                                                )}
                                            </span>
                                            <span>
                                                {transaction.from.replace(
                                                    /_$/,
                                                    ""
                                                )}
                                            </span>
                                            <span>
                                                {transaction.to.replace(
                                                    /_$/,
                                                    ""
                                                )}
                                            </span>
                                            <span>{transaction.amount}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-white">
                                        Não há nada por aqui ainda...
                                    </div>
                                )
                            ) : (
                                <svg
                                    className="animate-spin mx-auto w-10 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                            )}
                        </div>
                    </section>
                </main>

                <footer className="py-2 text-center  text-white font-bolder flex justify-center content-center">
                    <span className="block my-auto">Copyleft 🐀</span>
                </footer>
            </div>
        </>
    );
};

export default Home;
