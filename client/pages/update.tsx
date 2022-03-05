/* eslint-disable @next/next/no-img-element */
import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";
import config from "../config/config.json";
import axios, { Axios, AxiosResponse } from "axios";
import faker, { phone } from "faker";
import { useRouter } from "next/router";

const Update: NextPage = () => {
    const [error, setError] = useState<string>();
    const [form, setForm] = useState<Record<string, string>>({
        Nome: "",
        CPF: "",
        "E-mail": "",
        Senha: "",
        Telefone: "",
    });
    const router = useRouter();
    useEffect(() => {
        if (!window.localStorage.getItem("token")) {
            router.push("/login");
        } else {
            axios
                .get(config.server + "/me?includeProfile=true", {
                    headers: {
                        Authorization:
                            "Bearer " + window.localStorage.getItem("token"),
                    },
                })
                .then((res: AxiosResponse) => {
                    console.log(res);
                    setForm(res.data.profile);
                })
                .catch((e) => {
                    console.log(e);
                });
        }
    }, [router]);
    return (
        <>
            <Head>
                <title>CRU - Cadastro</title>
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
                <main className="md:flex md:flex-grow md:justify-center -mt-24 z-0">
                    <img
                        src="/cru.png"
                        alt="cru"
                        className="mx-auto md:my-auto md:mr-80 shadow-md"
                    />
                    <form
                        onSubmit={async (event) => {
                            event.preventDefault();
                            console.log(form);
                            if (!window.localStorage.getItem("token")) {
                                router.push("/login");
                            } else {
                                try {
                                    const res = await axios.post(
                                        config.server + "/update",
                                        form,
                                        {
                                            headers: {
                                                Authorization:
                                                    "Bearer " +
                                                    window.localStorage.getItem(
                                                        "token"
                                                    ),
                                            },
                                        }
                                    );
                                    // redirect
                                    router.push("/");
                                    console.log(res.data.result);
                                } catch (e) {
                                    if (axios.isAxiosError(e)) {
                                        setError(
                                            `Encountered following error: ${
                                                e.response?.data[
                                                    "result"
                                                ] as string
                                            }`
                                        );
                                    }
                                }
                            }
                        }}
                        className="max-w-full px-10 space-y-10 md:max-w-xl mx-auto md:my-auto md:ml-0"
                    >
                        {["Nome", "CPF", "E-mail", "Senha", "Telefone"].map(
                            (field) => (
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
                            )
                        )}
                        {error ? (
                            <p className="text-white font-bolder">{error}</p>
                        ) : null}
                        <button
                            className="w-full text-center bg-[#FEB93F] py-3 rounded-xl text-lg drop-shadow-md"
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                setForm({
                                    Nome: faker.name.findName(),
                                    CPF: faker.address.zipCode(),
                                    Matrícula: faker.datatype
                                        .number()
                                        .toString(),
                                    "E-mail": faker.internet.email(),
                                    Senha: faker.internet.password(),
                                    Telefone: faker.phone.phoneNumber(),
                                });
                            }}
                        >
                            Preencher
                        </button>
                        <button
                            className="w-full text-center bg-[#FEB93F] py-3 rounded-xl text-lg drop-shadow-md"
                            type="submit"
                        >
                            Atualizar
                        </button>
                    </form>
                </main>
                <footer className="py-2 text-center  text-white font-bolder flex justify-center content-center">
                    <span className="block my-auto ml-auto mr-auto md:flex-grow">CRU - UFSC</span>
                </footer>
            </div>
        </>
    );
};

export default Update;
