import type { NextPage } from "next";
import Head from "next/head";
import { useState } from "react";

const Home: NextPage = () => {
    const [form, setForm] = useState<Record<string, string>>({ Matrícula: "", Senha: "" });
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
                            className="mx-auto md:my-auto md:mr-80"
                        />
                        <div>
                            <p>
                                Bem vindo,
                                nome_do_beneficiário
                            </p>
                            <p>
                                Seu saldo é:
                            </p>
                            <p className="text-4xl">
                                110.00 CRU
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
                            ].map(label => (
                                <button
                                    className="text-center bg-[#FEB93F] py-8 rounded-xl text-lg drop-shadow-md"
                                    type="button"
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
