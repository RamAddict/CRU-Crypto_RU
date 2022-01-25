/* eslint-disable @next/next/no-img-element */
import axios, { AxiosResponse } from "axios";
import type { NextPage, NextApiRequest, NextApiResponse } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import config from "../config/config.json";
import { useEffect, useState } from "react";

// export const getServerSideProps = (async function ({ req, res }: {req: NextApiRequest, res: NextApiResponse}) {
//     if (!req.headers.authorization) {
//       return {
//         redirect: {
//           destination: '/login',
//           permanent: false,
//         },
//       }
//     } else {
//         return {
//           props: { user: req.query.user },
//         }
//     }

//   })

const Home: NextPage = () => {
    const router = useRouter();
    const [beneficiary, setBeneficiary] = useState<string | undefined>();
    const [balance, setBalance] = useState<Number | null>(null);
    useEffect(() => {
        if (!window.localStorage.getItem("token")) {
            router.push("/login");
        } else {
            axios
                .get(config.server + "/me", {
                    headers: {
                        Authorization:
                            "Bearer " + window.localStorage.getItem("token"),
                    },
                })
                .then((res: AxiosResponse) => {
                    setBeneficiary(res.data.beneficiary);
                    setBalance(res.data.balance);
                    console.log(res);
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
                {/* <header></header> */}
                <main className="md:flex-grow flex-col my-auto">
                    <section className="text-white text-center mx-auto my-auto flex flex-grow">
                        <img
                            src="/cru.png"
                            alt="cru"
                            className="mx-auto md:my-auto md:mr-80 shadow-md"
                        />
                        <div className="w-3/12">
                            <p>Bem vind@, {beneficiary}</p>
                            <p>Seu saldo é:</p>
                            <p className="text-4xl">
                                {balance !== null ? (
                                    <>{balance?.toFixed(2)} CRU</>
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
                            </p>
                        </div>
                    </section>
                    <section className="space-y-4">
                        <p className="block text-white text-center mx-auto my-auto">
                            Ações:
                        </p>
                        <div className="grid auto-rows-auto grid-cols-2 gap-8 max-w-5xl px-8 mx-auto">
                            {[
                                "Histórico",
                                "Transferência",
                                "Atualizar Cadastro",
                                "Logout",
                                // "Emitir",
                            ].map((label) => (
                                <button
                                    key={label}
                                    className="text-center bg-[#FEB93F] py-8 rounded-xl text-lg drop-shadow-md"
                                    type="button"
                                    onClick={(e) => {
                                        switch (label) {
                                            case "Histórico":
                                                break;
                                            case "Transferência":
                                                router.push("/transfer");
                                                break;
                                            case "Atualizar Cadastro":
                                                router.push("/update");
                                                break;
                                            case "Logout":
                                                window.localStorage.removeItem(
                                                    "token"
                                                );
                                                router.push("/login");
                                                break;
                                            // case "Emitir":

                                            // break;
                                        }
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
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
