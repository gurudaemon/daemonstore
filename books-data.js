const BOOKS = [
    {
        id: 1,
        title: "O Pináculo de Pain",
        subtitle: "",
        year: 2026,
        status: "disponivel",
        price: 4990,
        coverUrl: "assets/covers/pinaculo-de-pain.png",
        pages: 0,
        synopsis: "",
        quote: "",
        tags: ["ficção", "filosofia", "fantasia"],
        buyLink: "",
        previewText: "",
        extras: [
            { label: "Faixa inspirada", value: "Dummm by Mc Memi" },
            { label: "Formato", value: "Digital (PDF + EPUB)" },
            { label: "Idioma", value: "Português" }
        ]
    },
    {
        id: 2,
        title: "Manifesto do Artista Sem Gravadora",
        subtitle: "",
        year: 2026,
        status: "gratuito",
        price: 0,
        coverUrl: "assets/covers/manifesto.png",
        pages: 0,
        synopsis: "",
        quote: "",
        tags: ["ensaio", "manifesto", "independência"],
        buyLink: null,
        previewText: "",
        extras: [
            { label: "Preço", value: "Gratuito (doação opcional)" },
            { label: "Formato", value: "PDF" }
        ]
    },
    {
        id: 3,
        title: "Fêmea — Letras Comentadas",
        subtitle: "",
        year: 2026,
        status: "pre-venda",
        price: 2990,
        coverUrl: "assets/covers/femea-livro.png",
        pages: 0,
        synopsis: "",
        quote: "",
        tags: ["poesia", "rap", "música"],
        buyLink: null,
        previewText: "",
        extras: [
            { label: "Status", value: "Pré-venda" },
            { label: "Previsão", value: "Agosto/2026" }
        ]
    }
];
window.BOOKS = BOOKS;
