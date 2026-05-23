import express from 'express'
import bcrypt from 'bcrypt'
import prisma from '../prismaClient.js'

const router = express.Router()

router.post('/register', async (req, res) => {
    console.log(req.body)
    try {
        const { name, email, password } = req.body

        const username = email.split('@')[0]

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        })

        if (existingUser) {
            return res.status(400).json({
                ok: false,
                message: 'Account already exists'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                username,
                password: hashedPassword
            }
        })

        res.json({
            ok: true,
            user
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({
            ok: false,
            message: 'Server error'
        })
    }
})

router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        })

        if (!user) {
            return res.status(400).json({
                ok: false,
                message: 'User not found'
            })
        }

        const valid = await bcrypt.compare(password, user.password)

        if (!valid) {
            return res.status(400).json({
                ok: false,
                message: 'Incorrect password'
            })
        }

        res.json({
            ok: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                username: user.username
            }
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({
            ok: false,
            message: 'Server error'
        })
    }
})

export default router