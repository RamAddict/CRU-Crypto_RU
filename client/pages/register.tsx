import type { NextPage } from "next";
import Head from "next/head";
import { useState } from "react";

const Home: NextPage = () => {
    const [form, setForm] = useState<Record<string, string>>({Nome: "", CPF: "", Matrícula: "", "E-mail": "", Senha: "", Telefone: "" });
    return (
        <>
            <Head>
                <title>CRU</title>
            </Head>
            <div className="h-screen bg-gradient-to-b from-[#2B0245] via-[#2B0245] to-[#FEB93F] flex flex-col justify-between">
                {/* <header></header> */}
                <main className="md:flex md:flex-grow md:justify-center">
                    <img src="/cru.png" alt="cru" className="mx-auto md:my-auto md:mr-80" />
                    <form onSubmit={(event) => {
                            event.preventDefault();
                            console.log(form);
                        }}
                    className="max-w-full px-10 space-y-10 md:max-w-xl mx-auto md:my-auto md:ml-0">
                        {[
                            "Nome",
                            "CPF",
                            "Matrícula",
                            "E-mail",
                            "Senha",
                            "Telefone",
                        ].map((field) => (
                            <fieldset className="flex justify-between">
                                <label className="text-white block text-center text-2xl my-auto mr-auto">
                                    {field}
                                </label>
                                <input
                                    value={form[field]}
                                    onChange={(e) => setForm({...form, [field]: e.target.value})}
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
                        <button
                            className="w-full text-center bg-[#FEB93F] py-3 rounded-xl text-lg drop-shadow-md"
                            type="submit"
                        >
                            Cadastrar
                        </button>
                    </form>
                </main>
                <footer className="py-2 text-center  text-white font-bolder flex justify-center content-center">
                    <span className="block my-auto">Copyleft 🐀</span>
                </footer>
            </div>
        </>
    );
};

export default Home;
