'use client';

import { IconBrain, IconRobot, IconSparkles } from '@tabler/icons-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';

const Header = () => {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden bg-neutral-950"
    >
      <div className="relative z-10 px-2 py-4">
        <div className="flex items-center justify-start">
          {/* Logo Only */}
          <Link href="/" className="group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <Image
                src="/logo.png"
                alt="Recruitment Logo"
                width={120}
                height={35}
                className="rounded-lg"
                priority
                style={{ height: "auto" }}
              />
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
