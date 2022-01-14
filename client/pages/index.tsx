import type { NextPage, NextApiRequest, NextApiResponse } from "next";
import Head from "next/head";
import { useState } from "react";

export const getServerSideProps = (async function ({ req, res }: {req: NextApiRequest, res: NextApiResponse}) {
    if (!req.headers.authorization) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      }
    } else {
        return {
          props: { user: req.query.user },
        }
    }
  
  })

  const Home: NextPage = () => {
    return (
        <>
            <Head>
                <title>CRU</title>
            </Head>
            <div className="h-screen bg-gradient-to-b from-[#2B0245] via-[#2B0245] to-[#FEB93F] flex flex-col justify-between">
                {/* <header></header> */}
                <main className="md:flex md:flex-grow md:justify-center">
                 
                </main>
                <footer className="py-2 text-center  text-white font-bolder flex justify-center content-center">
                    <span className="block my-auto">Copyleft 🐀</span>
                </footer>
            </div>
        </>
    );
};

export default Home;
